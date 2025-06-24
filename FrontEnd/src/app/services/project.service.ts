// FrontEnd/src/app/services/project.service.ts

import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { Project } from '../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { ProjectMapper } from '../mappers/project.mapper'; // Upewnij się, że ten import jest
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { isEqual } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private apiService = inject(ApiService);

  // Private writable signal for internal state management of projects
  private _projects = signal<Project[]>([], {
    equal: (a, b) => isEqual(a, b),
  });

  // Public read-only signal for components to consume
  projects = this._projects.asReadonly();

  // Signals for filtering
  filterText = signal<string>('');
  statusFilter = signal<'all' | 'active' | 'on_hold' | 'completed'>('all');

  // Computed signal for filtered projects
  filteredProjects = computed(() => {
    const allProjects = this.projects();
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

  constructor() {
    // Effect to log current projects state - useful for debugging
    effect(() => {
      console.log('Current projects state (ProjectService):', this.projects());
    });
  }

  /**
   * Loads projects for a specific user from the API.
   * @param userId The ID of the user to load projects for.
   * @returns An Observable of the projects.
   */
  loadProjects(userId: string): Observable<Project[]> {
    return this.apiService.get<Project[]>(`projects?userId=${userId}`).pipe(
      map((projectDtos) => projectDtos.map(ProjectMapper.fromDto)),
      tap((projects) => this._projects.set(projects)), // Update the private writable signal
      catchError((error) => {
        console.error('Failed to load projects:', error);
        this._projects.set([]); // Clear projects on error to avoid stale data
        return of([]); // Return an empty array observable gracefully
      })
    );
  }

  /**
   * Retrieves a single project by its ID.
   * @param projectId The ID of the project to retrieve.
   * @returns An Observable of the Project.
   */
  getProjectById(projectId: string): Observable<Project | undefined> {
    // Note: JSON Server's GET /projects/:id returns a single object or 404
    return this.apiService.get<Project>(`projects/${projectId}`).pipe(
      map(ProjectMapper.fromDto),
      catchError((error) => {
        console.error(`Failed to get project with ID ${projectId}:`, error);
        return of(undefined); // Return undefined observable gracefully on error
      })
    );
  }

  /**
   * Creates a new project in the API.
   * @param dto The data transfer object for the new project.
   * @returns An Observable of the created Project.
   */
  createProject(dto: CreateProjectDto): Observable<Project> {
    return this.apiService.post<Project>('projects', dto).pipe(
      map(ProjectMapper.fromDto),
      tap((newProject) => {
        this._projects.update((projects) => [...projects, newProject]); // Add new project to the signal
      }),
      catchError((error) => {
        console.error('Failed to create project:', error);
        throw error;
      })
    );
  }

  /**
   * Updates an existing project in the API.
   * @param projectId The ID of the project to update.
   * @param dto The data transfer object for the update.
   * @returns An Observable of the updated Project.
   */
  updateProject(projectId: string, dto: UpdateProjectDto): Observable<Project> {
    return this.apiService.patch<Project>(`projects/${projectId}`, dto).pipe(
      // ZMIENIONO PUT NA PATCH
      map(ProjectMapper.fromDto), // DODANO MAPPING
      tap((updatedProject) => {
        this._projects.update((projects) =>
          projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        ); // Update the specific project in the signal
      }),
      catchError((error) => {
        console.error('Failed to update project:', error);
        throw error;
      })
    );
  }

  /**
   * Deletes a project from the API.
   * @param projectId The ID of the project to delete.
   * @returns An Observable that completes when the project is deleted.
   */
  deleteProject(projectId: string): Observable<void> {
    return this.apiService.delete<void>(`projects/${projectId}`).pipe(
      tap(() => {
        this._projects.update((projects) =>
          projects.filter((p) => p.id !== projectId)
        ); // Remove deleted project from the signal
      }),
      catchError((error) => {
        console.error('Failed to delete project:', error);
        throw error;
      })
    );
  }

  /**
   * Clears the projects signal.
   */
  clearProjects(): void {
    this._projects.set([]);
    console.log('Projects cleared in ProjectService.');
  }
}
