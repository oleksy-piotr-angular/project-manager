import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Make sure this import is correct

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiUrl; // This should correctly pick up 'http://localhost:3000'

  constructor(private http: HttpClient) {}

  // **CRITICAL FIX HERE:**
  // The error message indicates something like `${'<span>'}{this.apiUrl}{'</span>'}/{path}` was compiled.
  // It MUST be plain `${this.apiUrl}/${path}`
  //!we use "json-server" package as mock API
  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${path}`);
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.apiUrl}/${path}`, body);
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.apiUrl}/${path}`, body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.apiUrl}/${path}`);
  }
}
