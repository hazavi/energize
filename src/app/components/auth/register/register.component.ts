import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';
import { supabase } from '../../../service/supabase.service'; // Import Supabase client

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  registerForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: boolean = false; // Controls password visibility

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword; // Toggle password visibility
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    const { username, email, password } = this.registerForm.value;

    try {
      // Call Supabase signUp method with user metadata
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            displayName: username, // Store the username as displayName in user_metadata
          },
        },
      });

      if (error) {
        throw error;
      }

      this.errorMessage = '';
      this.successMessage = 'Registered successfully!';

      // Show success snackbar
      const snackBarRef = this.snackBar.open(
        'Registered successfully! Please check your email.',
        '',
        {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['success-snackbar'],
        }
      );

      snackBarRef.afterDismissed().subscribe(() => {
        this.router.navigate(['/login']);
      });
    } catch (error: any) {
      console.error('Registration failed:', error);
      this.errorMessage =
        error.message || 'An error occurred during registration.';
      this.successMessage = '';
    }
  }
}
