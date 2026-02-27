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
import { supabase } from '../../../service/supabase.service'; // Import Supabase client
import { LoginResponse } from '../../../models/loginresponse'; // Import LoginResponse interface

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
  showPassword: boolean = false; // Controls password visibility
  isLoading: boolean = false; // Loading state
  loginResponse: LoginResponse | null = null; // Stores the login response

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword; // Toggle password visibility
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true; // Start loading

    const loginData = this.loginForm.value;

    try {
      // Call Supabase to handle login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        // ✅ Store the token for authentication
        localStorage.setItem('authToken', data.session.access_token);

        // Map the API response to the LoginResponse interface
        this.loginResponse = {
          userId: data.user.id, // Extract user ID from the response
          username: data.user.user_metadata['displayName'] || 'User', // Extract username from metadata
          email: data.user.email || '', // Extract email from the response or use an empty string as fallback
          role: data.user['role'] || 'user', // Extract role from metadata
          token: data.session.access_token, // Extract token from the session
        };

        // Save the entire login response as JSON in localStorage
        localStorage.setItem(
          'loginResponse',
          JSON.stringify(this.loginResponse)
        );

        this.errorMessage = '';
        this.successMessage = 'You have successfully logged in!';
        this.isLoading = false; // Stop loading
        this.router.navigate(['/workout']).then(() => {
          window.location.reload();
        });

      }
    } catch (error: any) {
      this.isLoading = false; // Stop loading
      this.errorMessage =
        error.message || 'Invalid credentials or an error occurred.';
      this.successMessage = '';
      console.error('Login failed:', error);
    }
  }
}
