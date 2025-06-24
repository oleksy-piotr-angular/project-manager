import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('ApiService', () => {
  let service: ApiService;
  let httpTestingController: HttpTestingController;
  const apiUrl = 'http://localhost:3000'; // Match environment.apiUrl

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule], // Import the testing module
      providers: [ApiService],
    });
    service = TestBed.inject(ApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Ensure that there are no outstanding requests
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Test GET method
  it('should make a GET request to the correct URL', () => {
    const testData = { id: '1', name: 'Test Item' };
    const path = 'items';

    service.get<any>(path).subscribe((data) => {
      expect(data).toEqual(testData);
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('GET');
    req.flush(testData); // Provide a mock response
  });

  // Test POST method
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
    req.flush(responseData);
  });

  // Test DELETE method
  it('should make a DELETE request to the correct URL', () => {
    const path = 'items/1';

    service.delete<void>(path).subscribe((response) => {
      expect(response).toBeNull(); // DELETE typically returns an empty body or null
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null); // Simulate a successful empty response
  });

  // Test PATCH method
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
    req.flush(responseData);
  });

  // Test error handling for GET
  it('should handle HTTP errors for GET requests', () => {
    const errorMessage = 'test 500 error';
    const path = 'items';

    service.get<any>(path).subscribe({
      next: () => fail('should have failed with the 500 error'),
      error: (error: Error) => {
        expect(error.message).toContain('Something went wrong'); // Check the user-facing error message
        expect(console.error).toHaveBeenCalledWith(
          `Backend returned code 500, body was: {}` // Check the logged backend error
        );
      },
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('GET');
    // Mock console.error to check what's logged
    spyOn(console, 'error');
    req.flush({}, { status: 500, statusText: 'Internal Server Error' });
  });

  // Test error handling for POST (example)
  it('should handle HTTP errors for POST requests', () => {
    const testData = { name: 'New Item' };
    const errorMessage = 'Bad Request';
    const path = 'items';

    service.post<any>(path, testData).subscribe({
      next: () => fail('should have failed with the 400 error'),
      error: (error: Error) => {
        expect(error.message).toContain('Something went wrong');
        expect(console.error).toHaveBeenCalledWith(
          `Backend returned code 400, body was: {"message":"Bad Request"}`
        );
      },
    });

    const req = httpTestingController.expectOne(`${apiUrl}/${path}`);
    expect(req.request.method).toBe('POST');
    spyOn(console, 'error');
    req.flush(
      { message: errorMessage },
      { status: 400, statusText: errorMessage }
    );
  });
});
