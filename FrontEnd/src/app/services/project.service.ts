import { Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { Project } from '../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../dtos/project.dto';
import { ProjectMapper } from '../mappers/project.mapper';
import { tap, catchError, map } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { isEqual } from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private _projects = signal<Project[]>([], {
    equal: (a, b) => isEqual(a, b),
  });
  projects = this._projects.asReadonly();

  filterText = signal<string>('');
  statusFilter = signal<'all' | 'active' | 'completed' | 'on_hold'>('all');

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

  constructor(private apiService: ApiService) {
    effect(() => {
      console.log('Current projects state:', this.projects());
    });
  }

  loadProjects(userId: string): Observable<Project[]> {
    return this.apiService.get<Project[]>(`projects?userId=${userId}`).pipe(
      map((projectDtos) => projectDtos.map(ProjectMapper.fromDto)),
      tap((projects) => this._projects.set(projects)),
      catchError((error) => {
        console.error('Failed to load projects', error);
        return of([]);
      })
    );
  }

  createProject(dto: CreateProjectDto): Observable<Project> {
    return this.apiService.post<Project>('projects', dto).pipe(
      map(ProjectMapper.fromDto),
      tap((newProject) => {
        this._projects.update((projects) => [...projects, newProject]);
      }),
      catchError((error) => {
        console.error('Failed to create project', error);
        throw error;
      })
    );
  }

  updateProject(projectId: string, dto: UpdateProjectDto): Observable<Project> {
    return this.apiService.put<Project>(`projects/${projectId}`, dto).pipe(
      map(ProjectMapper.fromDto),
      tap((updatedProject) => {
        this._projects.update((projects) =>
          projects.map((p) => (p.id === updatedProject.id ? updatedProject : p))
        );
      }),
      catchError((error) => {
        console.error('Failed to update project', error);
        throw error;
      })
    );
  }

  deleteProject(projectId: string): Observable<void> {
    return this.apiService.delete<void>(`projects/${projectId}`).pipe(
      tap(() => {
        this._projects.update((projects) =>
          projects.filter((p) => p.id !== projectId)
        );
      }),
      catchError((error) => {
        console.error('Failed to delete project', error);
        throw error;
      })
    );
  }
}
