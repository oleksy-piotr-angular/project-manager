import { Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { Project } from '../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto'; // Ensure correct path
import { ProjectMapper } from '../mappers/project.mapper'; // Ensure correct path
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { isEqual } from 'lodash'; // Make sure lodash is installed: npm install lodash @types/lodash

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  // Private writable signal for internal state management
  private _projects = signal<Project[]>([], {
    equal: (a, b) => isEqual(a, b), // Custom equality function for better change detection
  });

  // Public read-only signal for components to consume
  projects = this._projects.asReadonly();

  // Signals for filtering
  filterText = signal<string>('');
  statusFilter = signal<'all' | 'active' | 'completed' | 'on_hold'>('all');

  // Computed signal for filtered projects
  filteredProjects = computed(() => {
    const allProjects = this.projects(); // Access the read-only signal value
    const text = this.filterText().toLowerCase();
    const status = this.statusFilter();

    return allProjects.filter((project) => {
      const matchesText =
        project.name.toLowerCase().includes(text) ||
        project.description.toLowerCase().includes(text);
      const matchesStatus = status === 'all' || project.status === status;
      return matchesText && matchesStatus;
    });
  });

  constructor(private apiService: ApiService) {
    // Effect to log current projects state - useful for debugging
    effect(() => {
      console.log('Current projects state (ProjectService):', this.projects());
    });
  }

  // Method to load projects from the API
  loadProjects(userId: string): Observable<Project[]> {
    return this.apiService.get<Project[]>(`projects?userId=${userId}`).pipe(
      map((projectDtos) => projectDtos.map(ProjectMapper.fromDto)),
      tap((projects) => this._projects.set(projects)), // Update the private writable signal
      catchError((error) => {
        console.error('Failed to load projects:', error);
        this._projects.set([]); // Clear projects on error to avoid stale data
        return of([]); // Return an empty array observable to complete the stream gracefully
      })
    );
  }

  // *** NEW: Method to explicitly clear projects ***
  // This method provides a public API for other services/components
  // to clear the list of projects when needed (e.g., user logs out).
  clearProjects(): void {
    this._projects.set([]); // Directly manipulate the private writable signal
    console.log('Projects cleared in ProjectService.');
  }

  // Method to create a new project
  createProject(dto: CreateProjectDto): Observable<Project> {
    return this.apiService.post<Project>('projects', dto).pipe(
      map(ProjectMapper.fromDto),
      tap((newProject) => {
        this._projects.update((projects) => [...projects, newProject]); // Add new project to the signal
      }),
      catchError((error) => {
        console.error('Failed to create project:', error);
        throw error; // Re-throw to propagate the error to the subscriber
      })
    );
  }

  // Method to update an existing project
  updateProject(projectId: string, dto: UpdateProjectDto): Observable<Project> {
    return this.apiService.put<Project>(`projects/${projectId}`, dto).pipe(
      map(ProjectMapper.fromDto),
      tap((updatedProject) => {
        this._projects.update((projects) =>
          projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        ); // Update the specific project in the signal
      }),
      catchError((error) => {
        console.error('Failed to update project:', error);
        throw error; // Re-throw to propagate the error
      })
    );
  }

  // Method to delete a project
  deleteProject(projectId: string): Observable<void> {
    return this.apiService.delete<void>(`projects/${projectId}`).pipe(
      tap(() => {
        this._projects.update((projects) =>
          projects.filter((p) => p.id !== projectId)
        ); // Remove deleted project from the signal
      }),
      catchError((error) => {
        console.error('Failed to delete project:', error);
        throw error; // Re-throw to propagate the error
      })
    );
  }

  // Method to get a single project by ID (optional, depending on your needs)
  // This might not be used if you navigate to details via router state
  getProjectById(projectId: string): Observable<Project | undefined> {
    return this.apiService.get<Project>(`projects/${projectId}`).pipe(
      map(ProjectMapper.fromDto),
      catchError((error) => {
        console.error(`Failed to get project with ID ${projectId}:`, error);
        return of(undefined);
      })
    );
  }
}
