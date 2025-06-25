import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { LoginRequestDto, LoginResponseDto } from '../dtos/auth.dto'; // LoginResponseDto used for type annotation
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
  const mockUser: User = UserMapper.fromDto(mockUserDto); // User used for type annotation

  beforeEach(() => {
    // Create a spy object for ApiService
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['get', 'post']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy }, // Provide the spy as the ApiService
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpTestingController = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test to ensure a clean state
    localStorage.clear();

    // Re-configure TestBed to ensure `AuthService` is instantiated with fresh signals
    TestBed.resetTestingModule();
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
    // Verify that there are no outstanding HTTP requests
    try {
      httpTestingController.verify();
    } catch (error) {
      // Ignore verification errors if no requests were made or expected
    }
  });

  // Test that the service is created and initial auth state is correct.
  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test successful user login.
  it('should set isAuthenticated to true and currentUser on successful login', (done) => {
    // Mock the ApiService.get call to return a single user
    apiServiceSpy.get.and.returnValue(of([mockUserDto]));

    const loginRequest: LoginRequestDto = {
      // LoginRequestDto used for type annotation
      email: 'test@example.com',
      password: 'password',
    };

    service.login(loginRequest).subscribe((response) => {
      // Assert the response and authentication state
      expect(response).toEqual({
        token: 'mock-jwt-token-user1_id',
        userId: 'user1_id',
      });
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.currentUser()).toEqual(mockUser);
      // Verify localStorage items
      expect(localStorage.getItem('jwt_token')).toBe('mock-jwt-token-user1_id');
      expect(localStorage.getItem('current_user_id')).toBe('user1_id');
      expect(localStorage.getItem('current_user_data')).toBe(
        JSON.stringify(mockUserDto)
      );
      done();
    });

    // Verify ApiService.get was called with the correct parameters
    expect(apiServiceSpy.get).toHaveBeenCalledWith(
      `users?email=${loginRequest.email}&password=${loginRequest.password}`
    );
  });

  // Test failed login when no user is found.
  it('should not authenticate on failed login (no user)', (done) => {
    // Mock the ApiService.get call to return an empty array (no user found)
    apiServiceSpy.get.and.returnValue(of([]));

    const loginRequest: LoginRequestDto = {
      // LoginRequestDto used for type annotation
      email: 'wrong@example.com',
      password: 'wrongpassword',
    };

    service.login(loginRequest).subscribe((response) => {
      // Assert that authentication state remains false
      expect(response).toBeNull();
      expect(service.isAuthenticated()).toBeFalse();
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('jwt_token')).toBeNull();
      done();
    });
  });

  // Test login when API call results in an error.
  it('should not authenticate on API error during login', (done) => {
    // Mock ApiService.get to throw an error
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API down')));

    const loginRequest: LoginRequestDto = {
      // LoginRequestDto used for type annotation
      email: 'test@example.com',
      password: 'password',
    };

    // Spy on console.error to verify error logging
    spyOn(console, 'error');
    service.login(loginRequest).subscribe((response) => {
      // Assert that authentication state remains false and error is logged
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

  // Test user logout functionality.
  it('should clear authentication state on logout', () => {
    // Simulate a logged-in state in localStorage
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));
    service.checkAuth(); // Load initial state

    // Verify initial authenticated state
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser); // User used for type annotation

    service.logout(); // Perform logout
    // Assert that authentication state is cleared
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
    // Verify localStorage items are removed
    expect(localStorage.getItem('jwt_token')).toBeNull();
    expect(localStorage.getItem('current_user_id')).toBeNull();
    expect(localStorage.getItem('current_user_data')).toBeNull();
  });

  // Test checkAuth method when valid data is in localStorage.
  it('should correctly set authentication state from local storage on checkAuth', () => {
    // Simulate valid authentication data in localStorage
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', JSON.stringify(mockUserDto));

    // Call checkAuth and verify the returned and internal state
    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeTrue();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.currentUser()).toEqual(mockUser); // User used for type annotation
  });

  // Test checkAuth method when no token is present in localStorage.
  it('should correctly set authentication state when no token in local storage', () => {
    // Ensure localStorage is empty (done in beforeEach)
    // Call checkAuth and verify the returned and internal state
    const isAuthenticated = service.checkAuth();
    expect(isAuthenticated).toBeFalse();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test handling of corrupted user data in localStorage.
  it('should log out if current_user_data is corrupted', () => {
    // Simulate corrupted user data
    localStorage.setItem('jwt_token', 'some_token');
    localStorage.setItem('current_user_id', 'user1_id');
    localStorage.setItem('current_user_data', 'invalid json');

    // Spy on console.error and logout method
    spyOn(console, 'error');
    spyOn(service, 'logout');

    // Manually call the private method that loads user data
    service['loadUserFromLocalStorage']();

    // Verify that an error is logged and logout is called
    expect(console.error).toHaveBeenCalledWith(
      'Error parsing user data from local storage:',
      jasmine.any(SyntaxError)
    );
    expect(service.logout).toHaveBeenCalled();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  // Test user registration functionality.
  it('should call apiService.post and map response for registration', (done) => {
    const registerData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };
    const responseDto = { id: 'new_id', ...registerData };
    const expectedUser = UserMapper.fromDto(responseDto); // User used for type annotation

    // Mock ApiService.post to return the DTO response
    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.register(registerData).subscribe((user) => {
      // User used for type annotation
      // Assert the returned user and that ApiService.post was called
      expect(user).toEqual(expectedUser);
      expect(apiServiceSpy.post).toHaveBeenCalledWith('users', registerData);
      done();
    });
  });

  // Test error handling during user registration.
  it('should return null and log error if registration fails', (done) => {
    const registerData = {
      username: 'newuser',
      email: 'new@example.com',
      password: 'password123',
    };
    // Mock ApiService.post to throw an error
    apiServiceSpy.post.and.returnValue(
      throwError(() => new Error('Registration failed'))
    );

    // Spy on console.error
    spyOn(console, 'error');

    service.register(registerData).subscribe((user) => {
      // User used for type annotation
      // Assert that null is returned and error is logged
      expect(user).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Registration error:',
        jasmine.any(Error)
      );
      done();
    });
  });
});
