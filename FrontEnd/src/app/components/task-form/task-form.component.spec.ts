import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TaskFormComponent } from './task-form.component';
import { Task } from '../../models/task.model';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

// --- Test Host Component ---
// This host component simulates a parent component that interacts with TaskFormComponent.
// It provides inputs ([projectId], [editingTask]) and listens to outputs ((taskSaved), (cancel)).
@Component({
  template: `
    <app-task-form
      [projectId]="hostProjectId"
      [editingTask]="hostEditingTask"
      (taskSaved)="onTaskSaved($event)"
      (cancel)="onCancel()"
    >
    </app-task-form>
  `,
  standalone: true,
  imports: [TaskFormComponent], // Import the component being tested
})
class TestHostComponent {
  hostProjectId: string = 'testProjectId'; // Default value for the required projectId input
  hostEditingTask: Task | undefined; // Input for editing an existing task
  savedTask: Partial<Task> | undefined; // Stores the data emitted by taskSaved output
  cancelled = false; // Flag to check if the cancel event was emitted

  onTaskSaved(task: Partial<Task>) {
    // Handler for the taskSaved event
    this.savedTask = task;
  }
  onCancel() {
    // Handler for the cancel event
    this.cancelled = true;
  }
}

describe('TaskFormComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let component: TaskFormComponent; // The actual instance of TaskFormComponent

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent, ReactiveFormsModule, TestHostComponent], // Import TestHostComponent for proper input/output testing
      // TaskFormComponent does not inject any services in its current implementation,
      // so we don't need to provide service mocks here.
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    // Get the instance of the TaskFormComponent from the host fixture's debug element
    const taskFormDebugElement: DebugElement = hostFixture.debugElement.query(
      By.directive(TaskFormComponent)
    );
    component = taskFormDebugElement.componentInstance;

    hostFixture.detectChanges(); // Initial change detection for the host component and its child
  });

  // Test that the component is created successfully.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test form initialization for creation mode.
  it('should initialize form for creation mode', fakeAsync(() => {
    hostComponent.hostEditingTask = undefined; // Ensure we are in creation mode by setting the input to undefined
    hostFixture.detectChanges(); // Trigger change detection to update component inputs
    tick(); // Process any asynchronous operations (like ngOnInit completing)

    expect(component.taskForm).toBeDefined();
    expect(component.taskForm.value).toEqual({
      title: '',
      description: '',
      status: 'todo', // Default status as per component's initForm
      dueDate: '',
    });
    expect(component.taskForm.valid).toBeFalse(); // Form should be invalid initially due to required fields
  }));

  // Test form initialization for editing mode with an existing task.
  it('should initialize form for editing mode with existing task', fakeAsync(() => {
    const editTask: Task = {
      id: 't1',
      projectId: 'p1',
      title: 'Edit Task',
      description: 'Edit Desc',
      status: 'in_progress',
      dueDate: '2025-07-15',
    };
    hostComponent.hostEditingTask = editTask; // Set the editingTask input on the host component
    hostFixture.detectChanges(); // Trigger change detection
    tick(); // Process async operations (like ngOnChanges and initForm)

    expect(component.taskForm.value).toEqual({
      title: editTask.title,
      description: editTask.description,
      status: editTask.status,
      dueDate: editTask.dueDate,
    });
    expect(component.taskForm.valid).toBeTrue(); // Form should be valid with pre-filled valid data
  }));

  // Test form validity with valid data.
  it('should be valid with valid data', () => {
    component.taskForm.controls['title'].setValue('Valid Title');
    component.taskForm.controls['description'].setValue('Valid Description');
    component.taskForm.controls['status'].setValue('done');
    component.taskForm.controls['dueDate'].setValue('2025-08-01');
    expect(component.taskForm.valid).toBeTrue();
  });

  // Test form invalidity with missing title.
  it('should be invalid with missing title', () => {
    component.taskForm.controls['title'].setValue('');
    component.taskForm.controls['description'].setValue('Valid Description');
    component.taskForm.controls['status'].setValue('todo');
    component.taskForm.controls['dueDate'].setValue('2025-08-01');
    expect(component.taskForm.invalid).toBeTrue();
    expect(
      component.taskForm.controls['title'].hasError('required')
    ).toBeTrue();
  });

  // Test form invalidity with missing description.
  it('should be invalid with missing description', () => {
    component.taskForm.controls['title'].setValue('Valid Title');
    component.taskForm.controls['description'].setValue('');
    component.taskForm.controls['status'].setValue('todo');
    component.taskForm.controls['dueDate'].setValue('2025-08-01');
    expect(component.taskForm.invalid).toBeTrue();
    expect(
      component.taskForm.controls['description'].hasError('required')
    ).toBeTrue();
  });

  // Test that taskSaved event is emitted with new task data on valid submission.
  it('should emit taskSaved event with new task data on submit', fakeAsync(() => {
    hostComponent.hostEditingTask = undefined; // Set to creation mode
    hostFixture.detectChanges();
    tick();

    component.taskForm.controls['title'].setValue('New Task Title');
    component.taskForm.controls['description'].setValue('New Task Description');
    component.taskForm.controls['status'].setValue('todo');
    component.taskForm.controls['dueDate'].setValue('2025-09-01');

    component.onSubmit(); // Trigger form submission
    tick(); // Process any asynchronous operations

    // Expect the emitted data to be Partial<Task> as defined by the component's output
    const expectedTaskData: Partial<Task> = {
      title: 'New Task Title',
      description: 'New Task Description',
      status: 'todo',
      dueDate: '2025-09-01',
    };

    expect(hostComponent.savedTask).toEqual(expectedTaskData);
  }));

  // Test that taskSaved event is emitted with updated task data on valid submission.
  it('should emit taskSaved event with updated task data on submit', fakeAsync(() => {
    const editTask: Task = {
      id: 't1',
      projectId: 'p1',
      title: 'Original Title',
      description: 'Original Desc',
      status: 'todo',
      dueDate: '2025-07-15',
    };
    hostComponent.hostEditingTask = editTask; // Set to editing mode
    hostFixture.detectChanges();
    tick();

    component.taskForm.controls['title'].setValue('Updated Task Title');
    component.taskForm.controls['description'].setValue(
      'Updated Task Description'
    );
    component.taskForm.controls['status'].setValue('in_progress');
    component.taskForm.controls['dueDate'].setValue('2025-07-30');

    component.onSubmit(); // Trigger form submission
    tick(); // Process any asynchronous operations

    // Expect the emitted data to be Partial<Task> as defined by the component's output
    const expectedTaskData: Partial<Task> = {
      title: 'Updated Task Title',
      description: 'Updated Task Description',
      status: 'in_progress',
      dueDate: '2025-07-30',
    };

    expect(hostComponent.savedTask).toEqual(expectedTaskData);
  }));

  // Test that the form does not submit if it's invalid.
  it('should not submit if form is invalid', () => {
    hostComponent.hostEditingTask = undefined;
    hostFixture.detectChanges();
    tick();

    component.taskForm.controls['title'].setValue(''); // Make form invalid
    component.taskForm.controls['description'].setValue(''); // Make form invalid
    component.taskForm.controls['status'].setValue('todo');
    component.taskForm.controls['dueDate'].setValue('2025-09-01');

    component.onSubmit(); // Attempt to submit

    expect(hostComponent.savedTask).toBeUndefined(); // Nothing should have been emitted
  });

  // Test cancel button click.
  it('should emit cancel when cancel button is clicked', () => {
    component.onCancel(); // Call the component's method that emits the 'cancel' output
    expect(hostComponent.cancelled).toBeTrue(); // Check if the host component received the event
  });
});
