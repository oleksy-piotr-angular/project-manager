import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('ApiService', () => {
  let service: ApiService;
  let httpTestingController: HttpTestingController;
  const apiUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify that no outstanding requests are pending.
    httpTestingController.verify();
  });

  // Test to ensure the service is created successfully.
  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test for a successful GET request.
  it('should make a GET request to the correct URL', () => {
    const testData = { id: '1', name: 'Test Item' };
    const path = 'items';

    service.get<any>(path).subscribe((data) => {
      expect(data).toEqual(testData);
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('GET');
    req.flush(testData); // Provide the mock response
  });

  // Test for a successful POST request with a body.
  it('should make a POST request to the correct URL with body', () => {
    const testData = { name: 'New Item' };
    const responseData = { id: '2', ...testData };
    const path = 'items';

    service.post<any>(path, testData).subscribe((data) => {
      expect(data).toEqual(responseData);
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(testData);
    req.flush(responseData); // Provide the mock response
  });

  // Test for a successful DELETE request.
  it('should make a DELETE request to the correct URL', () => {
    const path = 'items/1';

    service.delete<void>(path).subscribe((response) => {
      expect(response).toBeNull(); // DELETE often returns null or an empty body
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null); // Provide the mock response
  });

  // Test for a successful PATCH request with a partial body.
  it('should make a PATCH request to the correct URL with partial body', () => {
    const partialData = { name: 'Updated Item' };
    const responseData = {
      id: '1',
      name: 'Updated Item',
      description: 'Original Description',
    };
    const path = 'items/1';

    service.patch<any>(path, partialData).subscribe((data) => {
      expect(data).toEqual(responseData);
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(partialData);
    req.flush(responseData); // Provide the mock response
  });

  // Test error handling for GET requests (e.g., 500 Internal Server Error).
  it('should handle HTTP errors for GET requests', () => {
    const errorMessage = 'test 500 error';
    const path = 'items';

    // Spy on console.error to check if error is logged
    spyOn(console, 'error');

    service.get<any>(path).subscribe({
      next: () => fail('should have failed with the 500 error'), // Should not reach here
      error: (error: HttpErrorResponse) => {
        expect(error.message).toContain('Something went wrong'); // Check the custom error message
        expect(console.error).toHaveBeenCalledWith(
          `Backend returned code 500, body was: {}` // Verify logged message
        );
      },
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('GET');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' }); // Simulate 500 error
  });

  // Test error handling for POST requests (e.g., 400 Bad Request).
  it('should handle HTTP errors for POST requests', () => {
    const testData = { name: 'New Item' };
    const errorMessage = 'Bad Request';
    const path = 'items';

    // Spy on console.error to check if error is logged
    spyOn(console, 'error');

    service.post<any>(path, testData).subscribe({
      next: () => fail('should have failed with the 400 error'), // Should not reach here
      error: (error: HttpErrorResponse) => {
        expect(error.message).toContain('Something went wrong'); // Check the custom error message
        expect(console.error).toHaveBeenCalledWith(
          `Backend returned code 400, body was: {"message":"Bad Request"}` // Verify logged message
        );
      },
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('POST');
    req.flush(
      { message: errorMessage },
      { status: 400, statusText: errorMessage }
    ); // Simulate 400 error
  });
});
