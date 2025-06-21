import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InputFieldComponent } from '../../shared/custom-controls/input-field/input-field.component';
import { ErrorMessageComponent } from '../../shared/error-message/error-message.component';
import { AuthService } from '../../services/auth.service';
import { customEmailValidator } from '../../shared/validators/email.validator';
import { NgIf } from '@angular/common';
import { tap } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputFieldComponent,
    ErrorMessageComponent,
    NgIf,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  loginError: string | null = null;

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    this.loginError = null;
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;

      this.authService
        .login({ email, password })
        .pipe(
          tap((response) => {
            this.isLoading = false;
            if (response) {
              this.router.navigate(['/dashboard']);
            } else {
              this.loginError = 'Błędny e-mail lub hasło.';
            }
          })
        )
        .subscribe({
          error: (err) => {
            this.isLoading = false;
            this.loginError = err.message || 'Wystąpił nieoczekiwany błąd.';
          },
        });
    }
  }
}
