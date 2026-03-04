import { Injectable } from '@angular/core';
import { supabase } from './supabase.service';
import { LoginResponse } from '../models/loginresponse';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser$ = new BehaviorSubject<LoginResponse | null>(this.getStoredUser());

  constructor() {
    // Listen for Supabase auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user: LoginResponse = {
          userId: session.user.id,
          username: session.user.user_metadata?.['displayName'] || 'User',
          email: session.user.email || '',
          role: session.user.role || 'user',
          token: session.access_token,
        };
        localStorage.setItem('authToken', session.access_token);
        localStorage.setItem('loginResponse', JSON.stringify(user));
        this.currentUser$.next(user);
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('loginResponse');
        this.currentUser$.next(null);
      }
    });
  }

  /** Sign up a new user with Supabase Auth */
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { displayName: username },
      },
    });
    if (error) throw error;
    return data;
  }

  /** Sign in with email & password via Supabase Auth */
  async signIn(email: string, password: string): Promise<LoginResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const user: LoginResponse = {
      userId: data.user.id,
      username: data.user.user_metadata?.['displayName'] || 'User',
      email: data.user.email || '',
      role: data.user.role || 'user',
      token: data.session.access_token,
    };

    localStorage.setItem('authToken', data.session.access_token);
    localStorage.setItem('loginResponse', JSON.stringify(user));
    this.currentUser$.next(user);
    return user;
  }

  /** Sign out via Supabase Auth */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    localStorage.removeItem('authToken');
    localStorage.removeItem('loginResponse');
    this.currentUser$.next(null);
  }

  /** Check if a user is currently logged in */
  isLoggedIn(): boolean {
    return !!localStorage.getItem('authToken');
  }

  /** Get stored auth token */
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /** Get the current user as an observable */
  getCurrentUser(): Observable<LoginResponse | null> {
    return this.currentUser$.asObservable();
  }

  /** Get the current user snapshot */
  getStoredUser(): LoginResponse | null {
    const stored = localStorage.getItem('loginResponse');
    return stored ? JSON.parse(stored) : null;
  }

  login(token: string): void {
    localStorage.setItem('authToken', token);
  }

  logout(): void {
    this.signOut();
  }
}
