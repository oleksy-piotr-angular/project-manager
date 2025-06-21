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
  // Signals do zarządzania stanem uwierzytelnienia i bieżącego użytkownika
  isAuthenticated = signal<boolean>(false);
  currentUser = signal<User | null>(null);

  constructor(private http: HttpClient, private apiService: ApiService) {
    this.loadUserFromLocalStorage(); // Załaduj stan przy starcie serwisu
  }

  // Metoda do obsługi logowania
  login(credentials: LoginRequestDto): Observable<LoginResponseDto | null> {
    // Dla JSON Servera, prosty mock logowania: znajdź użytkownika po emailu i haśle
    // WAŻNE: Pamiętaj, że w prawdziwej aplikacji nie wysyłałbyś hasła w URL-u
    // i używałbyś endpointu POST do uwierzytelniania.
    return this.apiService
      .get<any[]>(
        // *** NAPRAWIONA LINIA ***
        // Użycie prawidłowego literału szablonowego (backticks `) do budowy URL-a
        `users?email=${credentials.email}&password=${credentials.password}`
      )
      .pipe(
        map((users) => {
          if (users && users.length > 0) {
            const userDto = users[0];
            const token = 'mock-jwt-token-' + userDto.id; // Generowanie mockowego tokena JWT
            const userId = userDto.id;

            // Zapisz dane użytkownika w Local Storage
            localStorage.setItem('jwt_token', token);
            localStorage.setItem('current_user_id', userId);
            localStorage.setItem('current_user_data', JSON.stringify(userDto)); // Zapisz dane DTO

            // Zaktualizuj sygnały
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
          return of(null); // Zwróć Observable z nullem w przypadku błędu
        })
      );
  }

  // Metoda do obsługi wylogowania
  logout(): void {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_user_id');
    localStorage.removeItem('current_user_data');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    console.log('User logged out.');
  }

  // Metoda do sprawdzania, czy użytkownik jest zalogowany
  checkAuth(): boolean {
    const token = localStorage.getItem('jwt_token');
    this.isAuthenticated.set(!!token); // Ustaw isAuthenticated na true, jeśli token istnieje
    if (token && !this.currentUser()) {
      this.loadUserFromLocalStorage(); // Załaduj dane użytkownika, jeśli token jest, ale currentUser nie jest ustawiony
    }
    return this.isAuthenticated();
  }

  // Prywatna metoda do ładowania danych użytkownika z Local Storage
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
        this.logout(); // Wyloguj, jeśli dane są uszkodzone
      }
    } else {
      this.isAuthenticated.set(false);
      this.currentUser.set(null);
    }
  }

  // Metoda do rejestracji (dla JSON Servera - dodanie nowego użytkownika)
  register(userData: any): Observable<User | null> {
    // W JSON Serverze, po prostu dodajemy nowego użytkownika do zasobu 'users'
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
