import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { ApiService } from './api.service';
import { Task } from '../models/task.model'; // For type annotation only
import { CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto'; // For type annotation only
import { TaskMapper } from '../mappers/task.mapper';
import { of, throwError } from 'rxjs';

describe('TaskService', () => {
  let service: TaskService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const mockTaskDto1 = {
    id: 't1',
    projectId: 'p1',
    title: 'Task 1',
    description: 'Desc 1',
    status: 'todo',
    dueDate: '2025-07-01',
  };
  const mockTaskDto2 = {
    id: 't2',
    projectId: 'p1',
    title: 'Task 2',
    description: 'Desc 2',
    status: 'in_progress',
    dueDate: '2025-07-10',
  };
  const mockTask1: Task = TaskMapper.fromDto(mockTaskDto1); // Task used for type annotation
  const mockTask2: Task = TaskMapper.fromDto(mockTaskDto2); // Task used for type annotation

  beforeEach(() => {
    // Create a spy object for ApiService
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: ApiService, useValue: apiServiceSpy }, // Provide the spy as the ApiService
      ],
    });
    service = TestBed.inject(TaskService);
    service.clearTasks(); // Ensure tasks signal is clear before each test
  });

  // Test that the service is created and initial state is correct.
  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.tasks()).toEqual([]);
    expect(service.filterText()).toBe('');
    expect(service.statusFilter()).toBe('all');
  });

  // Test loading tasks for a specific project and updating the tasks signal.
  it('should load tasks for a project and update the tasks signal', (done) => {
    // Mock ApiService.get to return a list of task DTOs
    apiServiceSpy.get.and.returnValue(of([mockTaskDto1, mockTaskDto2]));
    const projectId = 'p1';

    service.loadTasks(projectId).subscribe((tasks: Task[]) => {
      // Task used for type annotation
      // Verify returned tasks and the signal's value
      expect(tasks).toEqual([mockTask1, mockTask2]);
      expect(service.tasks()).toEqual([mockTask1, mockTask2]);
      // Verify ApiService.get was called with correct path
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        `tasks?projectId=${projectId}`
      );
      done();
    });
  });

  // Test error handling when loading tasks fails.
  it('should clear tasks on loadTasks error', (done) => {
    // Mock ApiService.get to throw an error
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API Error')));
    const projectId = 'p1';
    spyOn(console, 'error'); // Spy on console.error to check logging

    service.loadTasks(projectId).subscribe((tasks: Task[]) => {
      // Task used for type annotation
      // Verify that tasks signal is cleared and error is logged
      expect(tasks).toEqual([]);
      expect(service.tasks()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load tasks:',
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test creating a new task successfully.
  it('should create a task and add it to the tasks signal', (done) => {
    const createDto: CreateTaskDto = {
      // CreateTaskDto used for type annotation
      projectId: 'p1',
      title: 'New Task',
      description: 'New Task Desc',
      status: 'todo',
    };
    const responseDto = { id: 't3', ...createDto };
    const newTask: Task = TaskMapper.fromDto(responseDto); // Task used for type annotation

    // Mock ApiService.post to return the new task DTO
    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.createTask(createDto).subscribe((task: Task) => {
      // Task used for type annotation
      // Verify the returned task and that it's added to the signal
      expect(task).toEqual(newTask);
      expect(service.tasks()).toEqual([newTask]);
      // Verify ApiService.post was called with correct data
      expect(apiServiceSpy.post).toHaveBeenCalledWith('tasks', createDto);
      done();
    });
  });

  // Test updating an existing task successfully and preserving projectId.
  it('should update a task and preserve projectId in the signal', (done) => {
    // Initialize tasks signal with existing tasks
    service['_tasks'].set([mockTask1]);

    const updateDto: UpdateTaskDto = {
      // UpdateTaskDto used for type annotation
      title: 'Updated Task 1 Title',
      status: 'done',
    };
    // The API might return the DTO without projectId, but the service should re-add it.
    const responseDtoWithoutProjectId = {
      id: 't1',
      title: 'Updated Task 1 Title',
      description: 'Desc 1',
      status: 'done',
      dueDate: '2025-07-01',
    };
    const expectedUpdatedTask: Task = { ...mockTask1, ...updateDto, id: 't1' }; // Task used for type annotation

    // Mock ApiService.patch to return the updated task DTO
    apiServiceSpy.patch.and.returnValue(of(responseDtoWithoutProjectId));

    service.updateTask(mockTask1.id, updateDto).subscribe((task: Task) => {
      // Task used for type annotation
      // Verify the returned task has the correct projectId and that the signal reflects the update
      expect(task.projectId).toBe(mockTask1.projectId);
      expect(service.tasks()).toEqual([expectedUpdatedTask]);
      // Verify ApiService.patch was called with correct ID and data
      expect(apiServiceSpy.patch).toHaveBeenCalledWith(
        `tasks/${mockTask1.id}`,
        updateDto
      );
      done();
    });
  });

  // Test deleting a task successfully.
  it('should delete a task and remove it from the tasks signal', (done) => {
    // Initialize tasks signal with existing tasks
    service['_tasks'].set([mockTask1, mockTask2]);

    // Mock ApiService.delete to return null (success)
    apiServiceSpy.delete.and.returnValue(of(null));

    service.deleteTask(mockTask1.id).subscribe(() => {
      // Verify the task is removed from the signal
      expect(service.tasks()).toEqual([mockTask2]);
      // Verify ApiService.delete was called with correct ID
      expect(apiServiceSpy.delete).toHaveBeenCalledWith(
        `tasks/${mockTask1.id}`
      );
      done();
    });
  });

  // Test clearing all tasks from the signal.
  it('should clear the tasks signal', () => {
    service['_tasks'].set([mockTask1]); // Set some tasks
    expect(service.tasks().length).toBe(1);
    service.clearTasks(); // Call clear method
    expect(service.tasks()).toEqual([]); // Verify it's empty
  });

  // Test filtering tasks by text in title or description.
  it('should filter tasks by title/description text', () => {
    service['_tasks'].set([
      mockTask1,
      mockTask2,
      { ...mockTask1, id: 't3', title: 'Another todo task' },
    ]);
    service.filterText.set('task 1'); // Set filter text

    // Verify filtered tasks match the criteria
    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([mockTask1]);

    service.filterText.set('another');
    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()[0].id).toBe('t3');
  });

  // Test filtering tasks by status.
  it('should filter tasks by status', () => {
    service['_tasks'].set([mockTask1, mockTask2]);
    service.statusFilter.set('in_progress'); // Set status filter

    // Verify filtered tasks match the criteria
    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([mockTask2]);
  });

  // Test filtering tasks by both text and status combined.
  it('should filter tasks by text and status combined', () => {
    service['_tasks'].set([
      mockTask1,
      mockTask2,
      { ...mockTask1, id: 't3', title: 'Another todo task', status: 'todo' },
      {
        ...mockTask2,
        id: 't4',
        title: 'Another in_progress task',
        status: 'in_progress',
      },
    ]);

    service.filterText.set('another'); // Set text filter
    service.statusFilter.set('todo'); // Set status filter

    // Verify filtered tasks match both criteria
    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([
      { ...mockTask1, id: 't3', title: 'Another todo task', status: 'todo' },
    ]);
  });
});
