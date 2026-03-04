import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoadingComponent } from './components/loading/loading.component';
import { LoginResponse } from './models/loginresponse';
import { AuthService } from './service/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterModule, LoadingComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  title = 'EnerGize';
  isCollapsed = false;
  username: string | null = null; // Stores the username
  userId: string | null = null; // Stores the user ID
  isUserAdmin: boolean = false; // Indicates if the user is an admin
  loginResponse: LoginResponse | null = null; // Stores the parsed login response
  isProfileMenuOpen = false; // Controls submenu visibility
  isLoading: boolean = false; // Loading state

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.updateProfileUI(); // Update UI based on login status
  }

  toggleSidebar() {
    this.isCollapsed = !this.isCollapsed;
  }

  // Toggle profile submenu visibility
  toggleProfileMenu() {
    if (this.isCollapsed) {
      this.isCollapsed = false;
      this.isProfileMenuOpen = true;
    } else {
      this.isProfileMenuOpen = !this.isProfileMenuOpen;
    }
  }

  // Update the UI based on login status
  updateProfileUI() {
    try {
      const loginResponse = localStorage.getItem('loginResponse');
      if (loginResponse) {
        // Parse the login response from localStorage
        this.loginResponse = JSON.parse(loginResponse);

        // Assign values to component properties
        this.username = this.loginResponse?.username || 'Profile';
        this.userId = this.loginResponse?.userId || null;

        // Check if the user is an admin
        this.isUserAdmin = this.loginResponse?.role === 'admin';
      } else {
        this.resetUI(); // Reset UI for logged-out state
      }

      // Trigger change detection to update the UI
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error parsing login response:', error);
      this.resetUI(); // Reset UI in case of an error
    }
  }

  // Reset UI for logged-out state
  private resetUI() {
    this.username = null;
    this.userId = null;
    this.isUserAdmin = false;
    this.loginResponse = null;
    this.isProfileMenuOpen = false; // Ensure submenu is closed
  }

  // Logout function
  async logout() {
    this.isLoading = true;
    await this.authService.signOut();
    this.resetUI();

    setTimeout(() => {
      this.router.navigate(['/login']).then(() => {
        this.isLoading = false;
        this.snackBar.open('You have been logged out!', '', {
          duration: 3000,
          verticalPosition: 'top',
          horizontalPosition: 'center',
          panelClass: ['danger-snackbar'],
        });

        this.cdr.detectChanges();
      });
    }, 1500);
  }
}
