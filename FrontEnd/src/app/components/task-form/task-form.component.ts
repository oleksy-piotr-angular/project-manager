import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.component.html',
  styleUrls: ['./task-form.component.scss'],
})
export class TaskFormComponent implements OnInit, OnChanges {
  @Input() projectId!: string; // Required input: the ID of the project this task belongs to
  @Input() editingTask: Task | undefined; // Optional input for editing an existing task
  @Output() taskSaved = new EventEmitter<Partial<Task>>(); // Event emitted when a task is saved (new or updated)
  @Output() cancel = new EventEmitter<void>(); // Event emitted when form is cancelled

  taskForm!: FormGroup;
  // Revised status options
  statusOptions: ('todo' | 'in_progress' | 'done')[] = [
    'todo',
    'in_progress',
    'done',
  ];

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Re-initialize form if editingTask changes (e.g., when opening form for a new task vs. editing existing)
    if (changes['editingTask'] && this.taskForm) {
      this.initForm();
    }
  }

  private initForm(): void {
    this.taskForm = new FormGroup({
      title: new FormControl(
        this.editingTask?.title || '',
        Validators.required
      ), // Changed from 'name'
      description: new FormControl(
        this.editingTask?.description || '',
        Validators.required
      ),
      status: new FormControl(
        this.editingTask?.status || 'todo',
        Validators.required
      ), // Default 'todo'
      dueDate: new FormControl(this.editingTask?.dueDate || ''),
    });
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      const formValue = this.taskForm.value;
      const taskData: Partial<Task> = {
        title: formValue.title, // Changed from 'name'
        description: formValue.description,
        status: formValue.status,
        dueDate: formValue.dueDate,
      };

      // Emit the task data, letting the parent component handle the create/update logic
      this.taskSaved.emit(taskData);
    } else {
      this.taskForm.markAllAsTouched();
      console.error('Task form is invalid.');
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
