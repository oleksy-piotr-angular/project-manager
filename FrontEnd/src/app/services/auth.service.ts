import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequestDto, LoginResponseDto } from '../dtos/auth.dto';
import { User } from '../models/user.model';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { UserMapper } from '../mappers/user.mapper';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  constructor(private apiService: ApiService) {
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    const token = localStorage.getItem('jwt_token');
    const userId = localStorage.getItem('current_user_id');
    if (token && userId) {
      this.isAuthenticated.set(true);
      this.fetchCurrentUser(userId);
    } else {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    }
  }

  login(credentials: LoginRequestDto): Observable<LoginResponseDto | null> {
    // For JSON Server, a simple mock login: find user by email and password
    return this.apiService
      .get<any[]>(
        `users?email=<span class="math-inline">\{credentials\.email\}&password\=</span>{credentials.password}`
      )
      .pipe(
        map((users) => {
          if (users && users.length > 0) {
            const userDto = users[0];
            const token = 'mock-jwt-token-' + userDto.id; // Generate a mock token
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('current_user_id', userDto.id);
            this.isAuthenticated.set(true);
            this.currentUser.set(UserMapper.fromDto(userDto));
            return { token: token, userId: userDto.id };
          }
          return null;
        }),
        catchError((error) => {
          console.error('Login error:', error);
          this.isAuthenticated.set(false);
          this.currentUser.set(null);
          return of(null);
        })
      );
  }

  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user_id');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
  }

  fetchCurrentUser(userId: string): void {
    this.apiService
      .get<User>(`users/${userId}`)
      .pipe(
        tap((userDto) => {
          if (userDto) {
            this.currentUser.set(UserMapper.fromDto(userDto));
          } else {
            this.logout();
          }
        }),
        catchError((err) => {
          console.error('Failed to fetch current user', err);
          this.logout();
          return of(null);
        })
      )
      .subscribe();
  }
}
