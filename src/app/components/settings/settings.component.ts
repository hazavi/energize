import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginResponse } from '../../models/loginresponse';
import { AuthService } from '../../service/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent implements OnInit {
  user: LoginResponse | null = null;
  appVersion = '1.0.0';
  showDeleteConfirm = false;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem('loginResponse');
    if (stored) {
      this.user = JSON.parse(stored);
    }
  }

  get userInitial(): string {
    return (this.user?.username?.[0] ?? this.user?.email?.[0] ?? '?').toUpperCase();
  }

  get memberSince(): string {
    return 'Member';
  }

  copyUserId(): void {
    if (this.user?.userId) {
      navigator.clipboard.writeText(this.user.userId);
      this.snackBar.open('User ID copied to clipboard', '', {
        duration: 2000,
        verticalPosition: 'top',
        horizontalPosition: 'center',
      });
    }
  }

  logout(): void {
    localStorage.clear();
    this.authService.logout();
    this.router.navigate(['/login']);
    this.snackBar.open('Logged out successfully', '', {
      duration: 2500,
      verticalPosition: 'top',
      horizontalPosition: 'center',
      panelClass: ['danger-snackbar'],
    });
  }

  toggleDeleteConfirm(): void {
    this.showDeleteConfirm = !this.showDeleteConfirm;
  }
}
