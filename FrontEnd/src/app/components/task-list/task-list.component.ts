import { Component, input, OnInit, inject } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task.model';
import { NgFor, NgIf, /*ToDo  NgClass ,*/ DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [NgFor, NgIf, /*ToDO NgClass, */ ReactiveFormsModule, DatePipe],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss'],
})
export class TaskListComponent implements OnInit {
  projectId = input.required<string>();
  taskService = inject(TaskService);

  filterControl = new FormControl<string>(''); // Explicit typing
  statusFilterControl = new FormControl<
    'all' | 'todo' | 'in_progress' | 'done'
  >('all'); // Explicit typing

  ngOnInit(): void {
    this.taskService.loadTasksForProject(this.projectId()).subscribe(); // Load tasks on initialization

    // FIX: We subscribe to valueChanges and manually update signals on the service
    this.filterControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((value) => {
        this.taskService.setFilterText(value || '');
      });

    this.statusFilterControl.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((value) => {
        this.taskService.setStatusFilter(value || 'all');
      });
  }

  getStatusDisplayName(status: 'todo' | 'in_progress' | 'done'): string {
    switch (status) {
      case 'todo':
        return 'To do';
      case 'in_progress':
        return 'In progress';
      case 'done':
        return 'Completed';
      default:
        return status;
    }
  }

  toggleTaskStatus(task: Task): void {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      error: (err) => alert(`Error changing task status: ${err.message}`),
    });
  }

  openCreateTaskForm(): void {
    alert(`A modal to create a task for project ${this.projectId()} will open`);
  }

  editTask(taskId: string): void {
    alert(`Edit task: ${taskId}`);
  }

  deleteTask(taskId: string): void {
    if (confirm('Are you sure you want to delete this task?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => alert('Task deleted successfully!'),
        error: (err) => alert(`Error deleting task: ${err.message}`),
      });
    }
  }
}
