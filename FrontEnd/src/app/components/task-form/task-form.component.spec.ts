import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskFormComponent } from './task-form.component';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Task } from '../../models/task.model';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  const mockTask = {
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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form for adding a new task', () => {
    component.projectId = 'new_project_id';
    component.ngOnInit();
    expect(component.taskForm).toBeDefined();
    expect(component.taskForm.controls['title'].value).toBe('');
    expect(component.taskForm.controls['description'].value).toBe('');
    expect(component.taskForm.controls['status'].value).toBe('todo');
    expect(component.taskForm.controls['dueDate'].value).toBe('');
    expect(component.taskForm.valid).toBeFalse();
  });

  it('should initialize form for editing an existing task', () => {
    component.projectId = 'existing_project_id';
    component.editingTask = mockTask;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.taskForm.controls['title'].value).toBe(mockTask.title);
    expect(component.taskForm.controls['description'].value).toBe(
      mockTask.description
    );
    expect(component.taskForm.controls['status'].value).toBe(mockTask.status);
    expect(component.taskForm.controls['dueDate'].value).toBe(mockTask.dueDate);
    expect(component.taskForm.valid).toBeTrue();
  });

  it('should re-initialize form when editingTask input changes', () => {
    component.projectId = 'p_test';
    component.editingTask = undefined;
    component.ngOnInit();
    fixture.detectChanges();
    expect(component.taskForm.controls['title'].value).toBe('');

    component.editingTask = mockTask;
    component.ngOnChanges({
      editingTask: {
        currentValue: mockTask,
        previousValue: undefined,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    fixture.detectChanges();
    expect(component.taskForm.controls['title'].value).toBe(mockTask.title);
  });

  it('should emit taskSaved event with new task data on submit', () => {
    spyOn(component.taskSaved, 'emit');
    component.projectId = 'new_project_id';
    component.ngOnInit();

    const newTaskData: Task = {
      id: 'as34r5df',
      projectId: component.projectId,
      title: 'New Task Title',
      description: 'New Task Description',
      status: 'todo',
      dueDate: '2025-09-01',
    };
    component.taskForm.controls['title'].setValue(newTaskData.title);
    component.taskForm.controls['description'].setValue(
      newTaskData.description
    );
    component.taskForm.controls['status'].setValue(newTaskData.status);
    component.taskForm.controls['dueDate'].setValue(newTaskData.dueDate);

    component.onSubmit();

    expect(component.taskSaved.emit).toHaveBeenCalledWith(newTaskData);
  });

  it('should emit taskSaved event with updated task data on submit', () => {
    spyOn(component.taskSaved, 'emit');
    component.projectId = 'existing_project_id';
    component.editingTask = mockTask;
    component.ngOnInit();

    const updatedTitle = 'Updated Title';
    component.taskForm.controls['title'].setValue(updatedTitle);
    component.onSubmit();

    expect(component.taskSaved.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: updatedTitle,
        description: mockTask.description,
        status: mockTask.status,
        dueDate: mockTask.dueDate,
      })
    );
  });

  it('should not emit taskSaved if form is invalid', () => {
    spyOn(component.taskSaved, 'emit');
    component.projectId = 'p1';
    component.ngOnInit();
    component.onSubmit();
    expect(component.taskSaved.emit).not.toHaveBeenCalled();
    expect(component.taskForm.get('title')?.touched).toBeTrue();
  });

  it('should emit cancel event on cancel button click', () => {
    spyOn(component.cancel, 'emit');
    component.onCancel();
    expect(component.cancel.emit).toHaveBeenCalled();
  });
});
