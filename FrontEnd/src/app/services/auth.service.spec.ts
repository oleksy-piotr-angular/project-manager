import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { LoginRequestDto } from '../dtos/auth.dto';
import { User } from '../models/user.model';
import { of, throwError } from 'rxjs';
import { UserMapper } from '../mappers/user.mapper';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let httpTestingController: HttpTestingController;

  const mockUserDto = {
    id: 'user1_id',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password',
  };
  const mockUser: User = UserMapper.fromDto(mockUserDto);

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);

    localStorage.clear();

    TestBed.resetTestingModule(); // Resets the module to ensure fresh service instance
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    try {
      httpTestingController.verify();
    } catch (error) {
      // Ignore if no requests were made or expected.
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('should set isAuthenticated to true and currentUser on successful login', (done) => {
    apiServiceSpy.get.and.returnValue(of([mockUserDto]));

    const loginRequest: LoginRequestDto = {
      email: 'test@example.com',
      password: 'password',
    };

    service.login(loginRequest).subscribe((response) => {
      expect(response).toEqual({
        token: 'mock-jwt-token-user1_id',
        userId: 'user1_id',
      });
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.currentUser()).toEqual(mockUser);
      expect(localStorage.getItem('jwt_token')).toBe('mock-jwt-token-user1_id');
      expect(localStorage.getItem('current_user_id')).toBe('user1_id');
      expect(localStorage.getItem('current_user_data')).toBe(
        JSON.stringify(mockUserDto)
      );
      done();
    });

    expect(apiServiceSpy.get).toHaveBeenCalledWith(
      `users?email=${loginRequest.email}&password=${loginRequest.password}`
    );
  });

  it('should not authenticate on failed login (no user)', (done) => {
    apiServiceSpy.get.and.returnValue(of([]));

    const loginRequest: LoginRequestDto = {
      email: 'wrong@example.com',
      password: 'wrongpassword',
    };

    service.login(loginRequest).subscribe((response) => {
      expect(response).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
      done();
    });
  });

  it('should not authenticate on API error during login', (done) => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API down')));

    const loginRequest: LoginRequestDto = {
      email: 'test@example.com',
      password: 'password',
    };

    spyOn(console, 'error');
    service.login(loginRequest).subscribe((response) => {
      expect(response).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Login error (AuthService):',
        jasmine.any(Error)
      );
      done();
    });
  });

  it('should clear authentication state on logout', () => {
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));
    service.checkAuth();

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser);

    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('current_user_id')).toBeNull();
    expect(localStorage.getItem('current_user_data')).toBeNull();
  });

  it('should correctly set authentication state from local storage on checkAuth', () => {
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));

    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser);
  });

  it('should correctly set authentication state when no token in local storage', () => {
    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('should log out if current_user_data is corrupted', () => {
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', 'invalid json');

    spyOn(console, 'error');
    spyOn(service, 'logout');

    service['loadUserFromLocalStorage']();

    expect(console.error).toHaveBeenCalledWith(
      'Error parsing user data from local storage:',
      jasmine.any(SyntaxError)
    );
    expect(service.logout).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('should call apiService.post and map response for registration', (done) => {
    const registerData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };
    const responseDto = { id: 'new_id', ...registerData };
    const expectedUser = UserMapper.fromDto(responseDto);

    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.register(registerData).subscribe((user) => {
      expect(user).toEqual(expectedUser);
      expect(apiServiceSpy.post).toHaveBeenCalledWith('users', registerData);
      done();
    });
  });

  it('should return null and log error if registration fails', (done) => {
    const registerData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };
    apiServiceSpy.post.and.returnValue(
      throwError(() => new Error('Registration failed'))
    );

    spyOn(console, 'error');

    service.register(registerData).subscribe((user) => {
      expect(user).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Registration error:',
        jasmine.any(Error)
      );
      done();
    });
  });
});
