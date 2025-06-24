import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'; // Import HttpErrorResponse
import { catchError, Observable, throwError } from 'rxjs';
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
      // A client-side or network error occurred. Handle it accordingly.
      console.error(
        `Client-side or network error on ${path}:`,
        error.error.message
      );
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(
        `Backend returned code ${error.status}, ` +
          `body was: ${JSON.stringify(error.error)}`
      );
    }
    // Return an observable with a user-facing error message.
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

  put<T>(path: string, body: any): Observable<T> {
    return this.http
      .put<T>(`${this.apiUrl}/${path}`, body)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.handleError(error, `PUT ${path}`)
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
