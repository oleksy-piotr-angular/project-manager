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
        return 'Do zrobienia';
      case 'in_progress':
        return 'W toku';
      case 'done':
        return 'Ukończone';
      default:
        return status;
    }
  }

  toggleTaskStatus(task: Task): void {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
      error: (err) => alert(`Błąd zmiany statusu zadania: ${err.message}`),
    });
  }

  openCreateTaskForm(): void {
    alert(
      `Otworzy się modal do tworzenia zadania dla projektu ${this.projectId()}`
    );
  }

  editTask(taskId: string): void {
    alert(`Edytuj zadanie: ${taskId}`);
  }

  deleteTask(taskId: string): void {
    if (confirm('Czy na pewno chcesz usunąć to zadanie?')) {
      this.taskService.deleteTask(taskId).subscribe({
        next: () => alert('Zadanie usunięte pomyślnie!'),
        error: (err) => alert(`Błąd podczas usuwania zadania: ${err.message}`),
      });
    }
  }
}
