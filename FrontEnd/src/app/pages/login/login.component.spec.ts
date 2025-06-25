import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LoginRequestDto, LoginResponseDto } from '../../dtos/auth.dto';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule], // Import LoginComponent itself as it's standalone, and ReactiveFormsModule
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initial change detection to set up the form
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the login form with empty fields', () => {
    expect(component.loginForm).toBeDefined();
    expect(component.loginForm.controls['email'].value).toBe('');
    expect(component.loginForm.controls['password'].value).toBe('');
  });

  it('should make email and password fields required', () => {
    const emailControl = component.loginForm.controls['email'];
    const passwordControl = component.loginForm.controls['password'];

    emailControl.setValue('');
    passwordControl.setValue('');

    expect(emailControl.valid).toBeFalse();
    expect(emailControl.hasError('required')).toBeTrue();
    expect(passwordControl.valid).toBeFalse();
    expect(passwordControl.hasError('required')).toBeTrue();
  });

  it('should display an error message on failed login', () => {
    // Spy on window.alert as per instructions (though typically custom modals are preferred)
    spyOn(window, 'alert');
    authServiceSpy.login.and.returnValue(of(null)); // Simulate failed login from service

    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('wrongpassword');
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'Login failed. Please check your credentials.'
    );
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to dashboard on successful login', () => {
    const mockResponse: LoginResponseDto = {
      token: 'mock-token',
      userId: 'user1',
    };
    authServiceSpy.login.and.returnValue(of(mockResponse)); // Simulate successful login

    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should disable submit button when form is invalid', () => {
    // Form is initially invalid due to required fields
    fixture.detectChanges();
    const submitButton = fixture.nativeElement.querySelector(
      'button[type="submit"]'
    );
    expect(submitButton.disabled).toBeTrue();

    // Fill form partially - still invalid
    component.loginForm.controls['email'].setValue('test@example.com');
    fixture.detectChanges();
    expect(submitButton.disabled).toBeTrue();

    // Fill form completely - should be valid
    component.loginForm.controls['password'].setValue('password123');
    fixture.detectChanges();
    expect(submitButton.disabled).toBeFalse();
  });

  it('should handle API error during login', () => {
    spyOn(window, 'alert');
    // Simulate an API error, e.g., network issue or server down
    authServiceSpy.login.and.returnValue(
      throwError(() => new Error('Network error'))
    );

    component.loginForm.controls['email'].setValue('test@example.com');
    component.loginForm.controls['password'].setValue('password123');
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(
      'An error occurred during login. Please try again.'
    );
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
