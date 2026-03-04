import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../service/auth.service';
import { LoginResponse } from '../../../models/loginresponse';

@Component({
  selector: 'app-login',
  imports: [FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  successMessage: string = '';
  showPassword: boolean = false;
  isLoading: boolean = false;
  loginResponse: LoginResponse | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    const { email, password } = this.loginForm.value;

    try {
      this.loginResponse = await this.authService.signIn(email, password);

      this.errorMessage = '';
      this.successMessage = 'You have successfully logged in!';
      this.isLoading = false;
      this.router.navigate(['/workout']).then(() => {
        window.location.reload();
      });
    } catch (error: any) {
      this.isLoading = false;
      this.errorMessage =
        error.message || 'Invalid credentials or an error occurred.';
      this.successMessage = '';
      console.error('Login failed:', error);
    }
  }
}
