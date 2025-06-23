import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LoginRequestDto } from '../dtos/auth.dto';
import { LoginResponseDto } from '../dtos/auth.dto';
import { User } from '../models/user.model';
import { UserMapper } from '../mappers/user.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Signals for managing authentication state and current user
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private apiService: ApiService) {
    this.loadUserFromLocalStorage(); // Load state on service startup
  }

  // Method for handling login
  login(credentials: LoginRequestDto): Observable<LoginResponseDto | null> {
    // For JSON Server, a simple mock login: find user by email and password
    // IMPORTANT: In a real app, you would not send the password in the URL
    // and would use a POST endpoint for authentication.
    return this.apiService
      .get<any[]>(
        // *** FIXED LINE ***
        // Use correct template literal (backticks `) to build the URL
        `users?email=${credentials.email}&password=${credentials.password}`
      )
      .pipe(
        map((users) => {
          if (users && users.length > 0) {
            const userDto = users[0];
            const token = 'mock-jwt-token-' + userDto.id; // Generate mock JWT token
            const userId = userDto.id;

            // Save user data in Local Storage
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('current_user_id', userId);
            localStorage.setItem('current_user_data', JSON.stringify(userDto)); // Save DTO data

            // Update signals
            this.isAuthenticated.set(true);
            this.currentUser.set(UserMapper.fromDto(userDto));

            console.log('Login successful for:', userDto.email);
            return { token: token, userId: userId };
          }
          console.warn(
            'Login failed: No user found with provided credentials.'
          );
          return null;
        }),
        catchError((error) => {
          console.error('Login error (AuthService):', error);
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
          return of(null); // Return Observable with null in case of error
        })
      );
  }

  // Method for handling logout
  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('current_user_data');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    console.log('User logged out.');
  }

  // Method to check if user is logged in
  checkAuth(): boolean {
    const token = localStorage.getItem('jwt_token');
    this.isAuthenticated.set(!!token); // Set isAuthenticated to true if token exists
    if (token && !this.currentUser()) {
      this.loadUserFromLocalStorage(); // Load user data if token exists but currentUser is not set
    }
    return this.isAuthenticated();
  }

  // Private method to load user data from Local Storage
  private loadUserFromLocalStorage(): void {
    const token = localStorage.getItem('jwt_token');
    const userData = localStorage.getItem('current_user_data');

    if (token && userData) {
      try {
        const userDto = JSON.parse(userData);
        this.currentUser.set(UserMapper.fromDto(userDto));
        this.isAuthenticated.set(true);
      } catch (e) {
        console.error('Error parsing user data from local storage:', e);
        this.logout(); // Log out if data is corrupted
      }
    } else {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    }
  }

  // Method for registration (for JSON Server - adding a new user)
  register(userData: any): Observable<User | null> {
    // In JSON Server, simply add a new user to the 'users' resource
    return this.apiService.post<any>('users', userData).pipe(
      map((userDto) => {
        if (userDto) {
          console.log('Registration successful:', userDto.email);
          return UserMapper.fromDto(userDto);
        }
        return null;
      }),
      catchError((error) => {
        console.error('Registration error:', error);
        return of(null);
      })
    );
  }
}
