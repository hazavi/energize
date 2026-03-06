import { provideRouter, Routes } from '@angular/router';
import { ExercisesComponent } from './components/exercises/exercises.component';
import { ExerciseDetailComponent } from './components/exercise-detail/exercise-detail.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { LoginComponent } from './components/auth/login/login.component';
import { AdminComponent } from './components/auth/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { WorkoutComponent } from './components/workout/workout.component';
import { HistoryComponent } from './components/history/history.component';

export const routes: Routes = [
  { path: '', redirectTo: '/workout', pathMatch: 'full' }, // Default redirect to home
  { path: 'workout', component: WorkoutComponent }, // Workout Page
  { path: 'exercises', component: ExercisesComponent }, // Exercises Page
  { path: 'exercises/:id', component: ExerciseDetailComponent }, // Exercise Detail
  { path: 'history', component: HistoryComponent }, // History Page


  { path: 'login', component: LoginComponent }, // Register Page
  { path: 'register', component: RegisterComponent }, // Register Page
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] }, // Admin Page
];
