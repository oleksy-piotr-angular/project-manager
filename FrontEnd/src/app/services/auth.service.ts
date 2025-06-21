// src/app/services/auth.service.ts
import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { LoginRequestDto, LoginResponseDto } from '../dtos/auth.dto';
import { User } from '../models/user.model';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators'; // Dodaj 'map'
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
    }
  }

  login(credentials: LoginRequestDto): Observable<LoginResponseDto | null> {
    // Symulowana autentykacja: w prawdziwej aplikacji wysłałbyś to do API
    return this.apiService
      .get<User[]>(
        `users?email=<span class="math-inline">\{credentials\.email\}&password\=</span>{credentials.password}`
      )
      .pipe(
        map((users) => {
          if (users && users.length > 0) {
            const user = users[0];
            const token = `fake-jwt-token-${Math.random()
              .toString(36)
              .substring(2)}`;
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('current_user_id', user.id);
            this.isAuthenticated.set(true);
            this.currentUser.set(user);
            // Zwróć symulowany token i ID użytkownika
            return { token: token, userId: user.id } as LoginResponseDto;
          } else {
            this.isAuthenticated.set(false);
            this.currentUser.set(null);
            // Zwróć null zamiast rzucać błędem, aby strumień się nie zakończył od razu.
            // Logika obsługi błędu będzie w komponentach.
            return null;
          }
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
            this.logout(); // Wyloguj, jeśli użytkownik nie istnieje
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
