import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);

  // Helper method for consistent error handling
  private handleError(error: HttpErrorResponse, path: string) {
    if (error.error instanceof ErrorEvent) {
      console.error(
        `Client-side or network error on ${path}:`,
        error.error.message
      );
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
          `body was: ${JSON.stringify(error.error)}`
      );
    }
    return throwError(
      () => new Error('Something went wrong; please try again later.')
    );
  }

  get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${this.apiUrl}/${path}`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError(error, `GET ${path}`)
        )
      );
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http
      .post<T>(`${this.apiUrl}/${path}`, body)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError(error, `POST ${path}`)
        )
      );
  }

  // FIX: change form PUT to PATCH, because of "json-server" behavior
  patch<T>(path: string, body: any): Observable<T> {
    return this.http
      .patch<T>(`${this.apiUrl}/${path}`, body)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError(error, `PATCH ${path}`)
        )
      );
  }

  delete<T>(path: string): Observable<T> {
    return this.http
      .delete<T>(`${this.apiUrl}/${path}`)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError(error, `DELETE ${path}`)
        )
      );
  }
}
