import { Injectable, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private _tasks = signal<Task[]>([]);
  tasks = this._tasks.asReadonly();

  constructor(private apiService: ApiService) {}

  loadTasksForProject(projectId: string): Observable<Task[]> {
    return this.apiService.get<Task[]>(`tasks?projectId=${projectId}`).pipe(
      tap((tasks) => this._tasks.set(tasks)),
      catchError((error) => {
        console.error(`Failed to load tasks for project ${projectId}`, error);
        return of([]);
      })
    );
  }

  createTask(task: Omit<Task, 'id'>): Observable<Task> {
    return this.apiService.post<Task>('tasks', task).pipe(
      tap((newTask) => {
        this._tasks.update((tasks) => [...tasks, newTask]);
      }),
      catchError((error) => {
        console.error('Failed to create task', error);
        throw error;
      })
    );
  }

  updateTask(taskId: string, updates: Partial<Task>): Observable<Task> {
    return this.apiService.put<Task>(`tasks/${taskId}`, updates).pipe(
      tap((updatedTask) => {
        this._tasks.update((tasks) =>
          tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
        );
      }),
      catchError((error) => {
        console.error('Failed to update task', error);
        throw error;
      })
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.apiService.delete<void>(`tasks/${taskId}`).pipe(
      tap(() => {
        this._tasks.update((tasks) => tasks.filter((t) => t.id !== taskId));
      }),
      catchError((error) => {
        console.error('Failed to delete task', error);
        throw error;
      })
    );
  }
}
