import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { LoginRequestDto } from '../dtos/auth.dto';
import { User } from '../models/user.model';
import { of, throwError } from 'rxjs';
import { UserMapper } from '../mappers/user.mapper';

describe('AuthService', () => {
  let service: AuthService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockUserDto = {
    id: 'user1_id',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password',
  };
  const mockUser: User = UserMapper.fromDto(mockUserDto);

  beforeEach(() => {
    // Create a spy object for ApiService
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy }, // Provide the spy
      ],
    });
    service = TestBed.inject(AuthService);

    // Clear localStorage before each test
    localStorage.clear();
    // Re-initialize service to ensure signals are clean
    TestBed.resetTestingModule(); // Resets the module to ensure fresh service instance
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test successful login
  it('should set isAuthenticated to true and currentUser on successful login', (done) => {
    // Mock the API response for get method (used for login in JSON Server mock)
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

  // Test failed login (no user found)
  it('should not authenticate on failed login (no user)', (done) => {
    apiServiceSpy.get.and.returnValue(of([])); // No user found

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

  // Test login error (API error)
  it('should not authenticate on API error during login', (done) => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API down'))); // Simulate API error

    const loginRequest: LoginRequestDto = {
      email: 'test@example.com',
      password: 'password',
    };

    spyOn(console, 'error'); // Spy on console.error
    service.login(loginRequest).subscribe((response) => {
      expect(response).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Login error:',
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test logout
  it('should clear authentication state on logout', () => {
    // First, simulate a logged-in state
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));
    service.checkAuth(); // Call checkAuth to update signals from local storage

    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser);

    service.logout();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('current_user_id')).toBeNull();
    expect(localStorage.getItem('current_user_data')).toBeNull();
  });

  // Test checkAuth (logged in)
  it('should correctly set authentication state from local storage on checkAuth', () => {
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));

    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser);
  });

  // Test checkAuth (not logged in)
  it('should correctly set authentication state when no token in local storage', () => {
    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test checkAuth with corrupted local storage data
  it('should log out if current_user_data is corrupted', () => {
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', 'invalid json');

    spyOn(console, 'error');
    spyOn(service, 'logout'); // Spy on logout to ensure it's called

    service['loadUserFromLocalStorage'](); // Directly call the private method for testing

    expect(console.error).toHaveBeenCalledWith(
      'Error parsing user data from local storage:',
      jasmine.any(SyntaxError)
    );
    expect(service.logout).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test register method
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
