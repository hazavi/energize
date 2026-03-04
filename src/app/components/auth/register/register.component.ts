import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../service/auth.service';

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
  showPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      return;
    }

    const { username, email, password } = this.registerForm.value;

    try {
      await this.authService.signUp(email, password, username);

      this.errorMessage = '';
      this.successMessage = 'Registered successfully!';

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
