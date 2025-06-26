import {
  Component,
  OnInit,
  inject,
  signal,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Project } from '../../models/project.model';
import { Task } from '../../models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '../../dtos/task.dto'; // Imported for type safety and better developer experience (IntelliSense, static analysis) when using TaskMapper.
import { TaskMapper } from '../../mappers/task.mapper';
import { CommonModule, NgIf, NgFor, TitleCasePipe } from '@angular/common';
import { TaskFormComponent } from '../../components/task-form/task-form.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [NgIf, NgFor, TaskFormComponent, CommonModule, TitleCasePipe],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss'],
})
export class ProjectDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  // Use a signal for projectId that reacts to route param changes
  projectIdSignal = toSignal(
    this.route.paramMap.pipe(map((paramMap) => paramMap.get('id'))),
    { initialValue: null }
  );
  projectId: string | null = null;
  project = signal<Project | undefined>(undefined);
  tasks = this.taskService.tasks; // Use the read-only signal from TaskService

  showTaskForm = signal(false);
  editingTask = signal<Task | undefined>(undefined);

  constructor(private injector: Injector) {}

  ngOnInit(): void {
    runInInjectionContext(this.injector, () => {
      // Effect to load project details and associated tasks when projectId or user changes
      effect(
        () => {
          this.projectId = this.projectIdSignal();
          const currentUserId = this.authService.currentUser()?.id;

          if (this.projectId && currentUserId) {
            // Load project details
            this.projectService.getProjectById(this.projectId).subscribe({
              next: (proj) => {
                if (proj && proj.userId === currentUserId) {
                  this.project.set(proj);
                  // Load tasks for this project
                  this.taskService.loadTasks(this.projectId!).subscribe({
                    next: () =>
                      console.log('Tasks loaded for project:', this.projectId),
                    error: (err) =>
                      console.error('Failed to load tasks for project:', err),
                  });
                } else {
                  console.warn(
                    'Project not found or does not belong to the current user.'
                  );
                  this.router.navigate(['/dashboard']); // Redirect if project not found or unauthorized
                }
              },
              error: (err) => {
                console.error('Failed to load project details:', err);
                this.project.set(undefined); // Clear project state on error
                this.router.navigate(['/dashboard']);
              },
            });
          } else if (!this.projectId) {
            console.warn('No Project ID provided in URL.');
            this.router.navigate(['/dashboard']);
          } else if (!currentUserId) {
            console.warn(
              'User not authenticated, cannot load project details.'
            );
            this.router.navigate(['/login']); // Or simply clear state
          }
        },
        { allowSignalWrites: true }
      );
    });
  }

  /**
   * Opens the task form for adding a new task.
   */
  openAddTaskForm(): void {
    if (!this.projectId) {
      console.error('Cannot add task: Project ID is missing.');
      alert('Error: Project ID is missing. Cannot add task.');
      return;
    }
    this.editingTask.set(undefined); // Clear any previous editing state
    this.showTaskForm.set(true);
  }

  /**
   * Handles saving a task (either new or updated).
   * @param taskData The partial Task object from the form.
   */
  onTaskFormSave(taskData: Partial<Task>): void {
    if (this.editingTask()) {
      // Update existing task
      const updateDto = TaskMapper.toUpdateDto(taskData);
      this.taskService.updateTask(this.editingTask()!.id, updateDto).subscribe({
        next: () => {
          alert('Task updated successfully!');
          this.showTaskForm.set(false);
          this.editingTask.set(undefined);
        },
        error: (err) => console.error('Error updating task:', err),
      });
    } else if (this.projectId) {
      // Create new task
      const createDto = TaskMapper.toCreateDto({
        ...taskData,
        projectId: this.projectId,
      });
      this.taskService.createTask(createDto).subscribe({
        next: () => {
          alert('Task added successfully!');
          this.showTaskForm.set(false);
        },
        error: (err) => console.error('Error adding task:', err),
      });
    }
  }

  /**
   * Closes the task form.
   */
  onTaskFormCancel(): void {
    this.showTaskForm.set(false);
    this.editingTask.set(undefined);
  }

  /**
   * Opens the task form for editing an existing task.
   * @param task The task to be edited.
   */
  editTask(task: Task): void {
    this.editingTask.set(task);
    this.showTaskForm.set(true);
  }

  /**
   * Deletes a task after user confirmation.
   * @param taskId The ID of the task to delete.
   */
  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => {
          alert('Task deleted successfully!');
        },
        error: (err) => console.error('Error deleting task:', err),
      });
    }
  }

  /**
   * Returns a display name for task status.
   * @param status The status of the task.
   * @returns A capitalized string for display.
   */
  getTaskStatusDisplayName(status: 'todo' | 'in_progress' | 'done'): string {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  }

  /**
   * Navigates back to the dashboard.
   */
  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
