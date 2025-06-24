import { inject, Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto';
import { TaskMapper } from '../mappers/task.mapper';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { isEqual } from 'lodash'; // Assuming lodash is used for signal equality

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private apiService = inject(ApiService);

  // Private writable signal for internal state management of tasks
  private _tasks = signal<Task[]>([], {
    equal: (a, b) => isEqual(a, b),
  });

  // Public read-only signal for components to consume
  tasks = this._tasks.asReadonly();

  // Signals for filtering tasks (optional, similar to projects)
  filterText = signal<string>('');
  // Revised status filter options
  statusFilter = signal<'all' | 'todo' | 'in_progress' | 'done'>('all');

  // Computed signal for filtered tasks
  filteredTasks = computed(() => {
    const allTasks = this.tasks();
    const text = this.filterText().toLowerCase();
    const status = this.statusFilter();

    return allTasks.filter((task) => {
      // Filter by 'title' instead of 'name'
      const matchesText =
        task.title.toLowerCase().includes(text) ||
        task.description.toLowerCase().includes(text);
      const matchesStatus = status === 'all' || task.status === status;
      return matchesText && matchesStatus;
    });
  });

  constructor() {
    // Effect to log current tasks state - useful for debugging
    effect(() => {
      console.log('Current tasks state (TaskService):', this.tasks());
    });
  }

  /**
   * Loads tasks for a specific project from the API.
   * @param projectId The ID of the project to load tasks for.
   * @returns An Observable of the tasks.
   */
  loadTasks(projectId: string): Observable<Task[]> {
    return this.apiService.get<Task[]>(`tasks?projectId=${projectId}`).pipe(
      map((taskDtos) => taskDtos.map(TaskMapper.fromDto)),
      tap((tasks) => this._tasks.set(tasks)), // Update the private writable signal
      catchError((error) => {
        console.error('Failed to load tasks:', error);
        this._tasks.set([]); // Clear tasks on error to avoid stale data
        return of([]); // Return an empty array observable gracefully
      })
    );
  }

  /**
   * Creates a new task in the API.
   * @param dto The data transfer object for the new task.
   * @returns An Observable of the created Task.
   */
  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.apiService.post<Task>('tasks', dto).pipe(
      map(TaskMapper.fromDto),
      tap((newTask) => {
        this._tasks.update((tasks) => [...tasks, newTask]); // Add new task to the signal
      }),
      catchError((error) => {
        console.error('Failed to create task:', error);
        throw error;
      })
    );
  }
  /**
   * Updates an existing task in the API.
   * @param taskId The ID of the task to update.
   * @param dto The data transfer object for the update.
   * @returns An Observable of the updated Task.
   */
  updateTask(taskId: string, dto: UpdateTaskDto): Observable<Task> {
    return this.apiService.patch<Task>(`tasks/${taskId}`, dto).pipe(
      //  change form PUT to PATCH
      map(TaskMapper.fromDto),
      tap((updatedTaskFromServer) => {
        this._tasks.update((tasks) =>
          tasks.map((t) => {
            if (t.id === updatedTaskFromServer.id) {
              const originalTask = tasks.find((task) => task.id === t.id);
              const projectId: string =
                updatedTaskFromServer.projectId ??
                originalTask?.projectId ??
                '';
              return {
                ...updatedTaskFromServer,
                projectId,
              };
            }
            return t;
          })
        );
      }),
      catchError((error) => {
        console.error('Failed to update task:', error);
        throw error;
      })
    );
  }

  /**
   * Deletes a task from the API.
   * @param taskId The ID of the task to delete.
   * @returns An Observable that completes when the task is deleted.
   */
  deleteTask(taskId: string): Observable<void> {
    return this.apiService.delete<void>(`tasks/${taskId}`).pipe(
      tap(() => {
        this._tasks.update((tasks) => tasks.filter((t) => t.id !== taskId)); // Remove deleted task from the signal
      }),
      catchError((error) => {
        console.error('Failed to delete task:', error);
        throw error;
      })
    );
  }

  /**
   * Clears the tasks signal.
   */
  clearTasks(): void {
    this._tasks.set([]);
    console.log('Tasks cleared in TaskService.');
  }
}
