import { Component, OnInit } from '@angular/core';

import { GenericService } from '../../service/generic.service';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';
import { Router } from '@angular/router';
import { NotificationService } from '../../service/notification.service';
import { LoginResponse } from '../../models/loginresponse';
import { WorkoutHistory } from '../../models/workouthistory';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [FormsModule, LoadingComponent],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.css']
})
export class HistoryComponent implements OnInit {
  workoutHistory: WorkoutHistory[] = [];
  filteredHistory: WorkoutHistory[] = [];
  isLoading: boolean = false;
  user: LoginResponse | null = null;
  
  filterMonth: number = new Date().getMonth();
  filterYear: number = new Date().getFullYear();
  months: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // For the stats section
  totalWorkouts: number = 0;
  totalDuration: number = 0;
  averageWorkoutTime: number = 0;
  mostActiveDay: string = '';
  
  // Calendar view
  calendarData: { [date: string]: { count: number, duration: number } } = {};
  
  constructor(
    private genericService: GenericService<any>,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const userStr = localStorage.getItem('loginResponse');
    if (userStr) {
      this.user = JSON.parse(userStr) as LoginResponse;
      this.loadWorkoutHistory();
    } else {
      this.router.navigate(['/login']);
    }
  }
  
  loadWorkoutHistory(): void {
    if (!this.user) return;
    
    this.isLoading = true;
    
    this.genericService.getAll(`workout_history?user_uid=eq.${this.user.userId}&order=date.desc`).subscribe(
      (data: WorkoutHistory[]) => {
        this.workoutHistory = data;
        this.applyFilters();
        this.calculateStats();
        this.generateCalendarData();
        this.isLoading = false;
      },
      (error) => {
        console.error('Error fetching workout history:', error);
        this.notificationService.error('Failed to load workout history');
        this.isLoading = false;
      }
    );
  }
  
  applyFilters(): void {
    // Filter by selected month and year
    this.filteredHistory = this.workoutHistory.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate.getMonth() === this.filterMonth && 
             workoutDate.getFullYear() === this.filterYear;
    });
  }
  
  changeMonth(offset: number): void {
    let newMonth = this.filterMonth + offset;
    let newYear = this.filterYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }
    
    this.filterMonth = newMonth;
    this.filterYear = newYear;
    this.applyFilters();
  }
  
  formatDuration(ms: number): string {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${seconds}s`;
    }
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  }
  
  calculateStats(): void {
    if (this.workoutHistory.length === 0) {
      this.totalWorkouts = 0;
      this.totalDuration = 0;
      this.averageWorkoutTime = 0;
      this.mostActiveDay = 'N/A';
      return;
    }
    
    // Total workouts is just the length
    this.totalWorkouts = this.workoutHistory.length;
    
    // Calculate total duration
    this.totalDuration = this.workoutHistory.reduce(
      (total, workout) => total + workout.duration, 0
    );
    
    // Calculate average time
    this.averageWorkoutTime = this.totalDuration / this.totalWorkouts;
    
    // Find most active day
    const dayCount: { [day: string]: number } = {};
    this.workoutHistory.forEach(workout => {
      dayCount[workout.day] = (dayCount[workout.day] || 0) + 1;
    });
    
    let maxCount = 0;
    this.mostActiveDay = 'N/A';
    
    Object.entries(dayCount).forEach(([day, count]) => {
      if (count > maxCount) {
        maxCount = count;
        this.mostActiveDay = day;
      }
    });
  }
  
  generateCalendarData(): void {
    this.calendarData = {};
    
    this.workoutHistory.forEach(workout => {
      const dateKey = workout.date.split('T')[0]; // Get YYYY-MM-DD part
      
      if (!this.calendarData[dateKey]) {
        this.calendarData[dateKey] = { count: 0, duration: 0 };
      }
      
      this.calendarData[dateKey].count++;
      this.calendarData[dateKey].duration += workout.duration;
    });
  }
  
  getDaysInMonth(month: number, year: number): Date[] {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Add days from previous month to start the week
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }
    
    // Add days of the current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push(date);
    }
    
    // Add days from next month to complete the week
    const lastDayOfWeek = lastDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    for (let i = 1; i < 7 - lastDayOfWeek; i++) {
      const date = new Date(year, month + 1, i);
      days.push(date);
    }
    
    return days;
  }
  
  getCalendarActivity(date: Date): { count: number, duration: number } | null {
    const dateKey = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    return this.calendarData[dateKey] || null;
  }
  
  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.filterMonth && date.getFullYear() === this.filterYear;
  }
  
  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  }
  
  deleteWorkout(id: number): void {
    if (confirm('Are you sure you want to delete this workout record?')) {
      this.genericService.deleteById('workout_history', id).subscribe(
        () => {
          this.workoutHistory = this.workoutHistory.filter(w => w.id !== id);
          this.applyFilters();
          this.calculateStats();
          this.generateCalendarData();
          this.notificationService.success('Workout record deleted successfully');
        },
        (error) => {
          console.error('Error deleting workout record:', error);
          this.notificationService.error('Failed to delete workout record');
        }
      );
    }
  }
}