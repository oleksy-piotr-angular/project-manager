//!(general service for communicating with API).
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
//import { environment } from '../../environments/environment'; //TODO

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:3000'; // TODO: Get from environment variables

  constructor(private http: HttpClient) {}

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(
      `<span class="math-inline">\{this\.apiUrl\}/</span>{path}`
    );
  }

  post<T>(path: string, body: any): Observable<T> {
    return this.http.post<T>(
      `<span class="math-inline">\{this\.apiUrl\}/</span>{path}`,
      body
    );
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<T>(
      `<span class="math-inline">\{this\.apiUrl\}/</span>{path}`,
      body
    );
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(
      `<span class="math-inline">\{this\.apiUrl\}/</span>{path}`
    );
  }
}
