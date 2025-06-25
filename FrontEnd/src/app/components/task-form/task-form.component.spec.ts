import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormComponent } from './task-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model'; // For type annotation only

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  const mockTask: Task = {
    id: 't1',
    projectId: 'p1',
    title: 'Existing Task',
    description: 'Existing description',
    status: 'in_progress' as 'in_progress',
    dueDate: '2025-08-01',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent, ReactiveFormsModule, CommonModule],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initialize the component
  });

  // Test that the component is created successfully.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test form initialization when adding a new task.
  it('should initialize form for adding a new task', () => {
    component.projectId = 'new_project_id'; // Set required projectId input
    component.ngOnInit(); // Manually call ngOnInit for input change detection
    expect(component.taskForm).toBeDefined();
    expect(component.taskForm.controls['title'].value).toBe('');
    expect(component.taskForm.controls['description'].value).toBe('');
    expect(component.taskForm.controls['status'].value).toBe('todo'); // Default status
    expect(component.taskForm.controls['dueDate'].value).toBe('');
    expect(component.taskForm.valid).toBeFalse(); // Title is required
  });

  // Test form initialization when editing an existing task.
  it('should initialize form for editing an existing task', () => {
    component.projectId = 'existing_project_id';
    component.editingTask = mockTask; // Set editingTask input
    component.ngOnInit(); // Manually call ngOnInit
    fixture.detectChanges();

    // Verify form fields are populated with existing task data
    expect(component.taskForm.controls['title'].value).toBe(mockTask.title);
    expect(component.taskForm.controls['description'].value).toBe(
      mockTask.description
    );
    expect(component.taskForm.controls['status'].value).toBe(mockTask.status);
    expect(component.taskForm.controls['dueDate'].value).toBe(mockTask.dueDate);
    expect(component.taskForm.valid).toBeTrue(); // Should be valid with pre-filled data
  });

  // Test form re-initialization when editingTask input changes using ngOnChanges.
  it('should re-initialize form when editingTask input changes', () => {
    component.projectId = 'p_test';
    component.editingTask = undefined; // Start with no editing task
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.taskForm.controls['title'].value).toBe(''); // Verify initial empty state

    component.editingTask = mockTask; // Change editingTask input
    component.ngOnChanges({
      editingTask: {
        currentValue: mockTask,
        previousValue: undefined,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    fixture.detectChanges();
    expect(component.taskForm.controls['title'].value).toBe(mockTask.title); // Verify form updated with mockTask data
  });

  // Test emitting taskSaved event with new task data on form submission.
  it('should emit taskSaved event with new task data on submit', () => {
    spyOn(component.taskSaved, 'emit'); // Spy on the output event emitter
    component.projectId = 'new_project_id';
    component.ngOnInit();

    const newTaskData: Task = {
      // Task used for type annotation
      id: 'as34r5df', // ID is generated later, but included for structure
      projectId: component.projectId,
      title: 'New Task Title',
      description: 'New Task Description',
      status: 'todo',
      dueDate: '2025-09-01',
    };
    // Fill the form with new task data
    component.taskForm.controls['title'].setValue(newTaskData.title);
    component.taskForm.controls['description'].setValue(
      newTaskData.description
    );
    component.taskForm.controls['status'].setValue(newTaskData.status);
    component.taskForm.controls['dueDate'].setValue(newTaskData.dueDate);

    component.onSubmit(); // Submit the form

    // Verify taskSaved event was emitted with the correct data
    expect(component.taskSaved.emit).toHaveBeenCalledWith(
      jasmine.objectContaining(newTaskData)
    );
  });

  // Test emitting taskSaved event with updated task data on form submission.
  it('should emit taskSaved event with updated task data on submit', () => {
    spyOn(component.taskSaved, 'emit');
    component.projectId = 'existing_project_id';
    component.editingTask = mockTask; // Set editingTask to simulate editing
    component.ngOnInit();

    const updatedTitle = 'Updated Title';
    component.taskForm.controls['title'].setValue(updatedTitle); // Update only the title

    component.onSubmit();

    // Verify taskSaved event was emitted with updated data, preserving other fields
    expect(component.taskSaved.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({
        id: mockTask.id, // ID should be preserved for editing
        projectId: mockTask.projectId,
        title: updatedTitle,
        description: mockTask.description,
        status: mockTask.status,
        dueDate: mockTask.dueDate,
      })
    );
  });

  // Test that taskSaved is NOT emitted if the form is invalid.
  it('should not emit taskSaved if form is invalid', () => {
    spyOn(component.taskSaved, 'emit');
    component.projectId = 'p1';
    component.ngOnInit();
    // Form is invalid by default because 'title' is required and empty
    component.onSubmit();
    expect(component.taskSaved.emit).not.toHaveBeenCalled(); // Verify event was not emitted
    expect(component.taskForm.get('title')?.touched).toBeTrue(); // Verify field is marked as touched for validation feedback
  });

  // Test emitting cancel event on cancel button click.
  it('should emit cancel event on cancel button click', () => {
    spyOn(component.cancel, 'emit'); // Spy on the cancel output event emitter
    component.onCancel(); // Call the cancel method
    expect(component.cancel.emit).toHaveBeenCalled(); // Verify cancel event was emitted
  });
});
