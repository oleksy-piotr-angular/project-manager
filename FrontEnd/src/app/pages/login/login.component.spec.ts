import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LoginRequestDto, LoginResponseDto } from '../../dtos/auth.dto'; // LoginRequestDto used for type annotation

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create spy objects for AuthService and Router
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }, // Provide the AuthService spy
        { provide: Router, useValue: routerSpy }, // Provide the Router spy
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initialize the component and its form
  });

  // Test that the component is created successfully.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test form initialization with empty fields.
  it('should initialize the login form with empty fields', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.controls['email'].value).toBe('');
    expect(component.loginForm.controls['password'].value).toBe('');
  });

  // Test that email and password fields are required.
  it('should make email and password fields required', () => {
    const emailControl = component.loginForm.controls['email'];
    const passwordControl = component.loginForm.controls['password'];

    emailControl.setValue(''); // Set value to empty
    passwordControl.setValue(''); // Set value to empty

    expect(emailControl.valid).toBeFalse();
    expect(emailControl.hasError('required')).toBeTrue();
    expect(passwordControl.valid).toBeFalse();
    expect(passwordControl.hasError('required')).toBeTrue();
  });

  // Test displaying an alert message on failed login.
  it('should display an error message on failed login', () => {
    spyOn(window, 'alert'); // Spy on window.alert
    authServiceSpy.login.and.returnValue(of(null)); // Mock login to return null (failure)

    // Set form values and submit
    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('wrongpassword');
    component.onSubmit();

    // Verify AuthService.login was called and an alert was shown
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'Login failed. Please check your credentials.'
    );
    expect(routerSpy.navigate).not.toHaveBeenCalled(); // Ensure no navigation on failure
  });

  // Test navigation to dashboard on successful login.
  it('should navigate to dashboard on successful login', () => {
    const mockResponse: LoginResponseDto = {
      token: 'mock-token',
      userId: 'user1',
    }; // LoginResponseDto used for type annotation
    authServiceSpy.login.and.returnValue(of(mockResponse)); // Mock login to return a successful response

    // Set form values and submit
    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();

    // Verify AuthService.login was called and navigated to dashboard
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  // Test submit button disabled state based on form validity.
  it('should disable submit button when form is invalid', () => {
    fixture.detectChanges();
    const submitButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    );
    expect(submitButton.disabled).toBeTrue(); // Initially disabled as fields are empty

    component.loginForm.controls['email'].setValue('test@example.com');
    fixture.detectChanges();
    expect(submitButton.disabled).toBeTrue(); // Still disabled, password is empty

    component.loginForm.controls['password'].setValue('password123');
    fixture.detectChanges();
    expect(submitButton.disabled).toBeFalse(); // Enabled when both fields are valid
  });

  // Test handling of API error during login.
  it('should handle API error during login', () => {
    spyOn(window, 'alert'); // Spy on window.alert
    authServiceSpy.login.and.returnValue(
      throwError(() => new Error('Network error'))
    ); // Mock login to throw an error

    // Set form values and submit
    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();

    // Verify AuthService.login was called and a generic error alert was shown
    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'An error occurred during login. Please try again.'
    );
    expect(routerSpy.navigate).not.toHaveBeenCalled(); // Ensure no navigation on error
  });
});
