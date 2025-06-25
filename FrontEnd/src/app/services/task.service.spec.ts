import { TestBed } from '@angular/core/testing';
import { TaskService } from './task.service';
import { ApiService } from './api.service';
import { Task } from '../models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto';
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
  const mockTask1: Task = TaskMapper.fromDto(mockTaskDto1);
  const mockTask2: Task = TaskMapper.fromDto(mockTaskDto2);

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [
        TaskService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    });
    service = TestBed.inject(TaskService);
    service.clearTasks(); // Ensure a clean state for signals before each test
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.tasks()).toEqual([]);
    expect(service.filterText()).toBe('');
    expect(service.statusFilter()).toBe('all');
  });

  // Test loadTasks
  it('should load tasks for a project and update the tasks signal', (done) => {
    apiServiceSpy.get.and.returnValue(of([mockTaskDto1, mockTaskDto2]));
    const projectId = 'p1';

    service.loadTasks(projectId).subscribe((tasks) => {
      expect(tasks).toEqual([mockTask1, mockTask2]);
      expect(service.tasks()).toEqual([mockTask1, mockTask2]);
      expect(apiServiceSpy.get).toHaveBeenCalledWith(
        `tasks?projectId=${projectId}`
      );
      done();
    });
  });

  it('should clear tasks on loadTasks error', (done) => {
    apiServiceSpy.get.and.returnValue(throwError(() => new Error('API Error')));
    const projectId = 'p1';
    spyOn(console, 'error');

    service.loadTasks(projectId).subscribe((tasks) => {
      expect(tasks).toEqual([]);
      expect(service.tasks()).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to load tasks:',
        jasmine.any(Error)
      );
      done();
    });
  });

  // Test createTask
  it('should create a task and add it to the tasks signal', (done) => {
    const createDto: CreateTaskDto = {
      projectId: 'p1',
      title: 'New Task',
      description: 'New Task Desc',
      status: 'todo',
    };
    const responseDto = { id: 't3', ...createDto };
    const newTask: Task = TaskMapper.fromDto(responseDto);

    apiServiceSpy.post.and.returnValue(of(responseDto));

    service.createTask(createDto).subscribe((task) => {
      expect(task).toEqual(newTask);
      expect(service.tasks()).toEqual([newTask]); // Initial state was empty
      expect(apiServiceSpy.post).toHaveBeenCalledWith('tasks', createDto);
      done();
    });
  });

  // Test updateTask - crucial test for projectId preservation
  it('should update a task and preserve projectId in the signal', (done) => {
    // Seed initial state
    service['_tasks'].set([mockTask1]);

    const updateDto: UpdateTaskDto = {
      title: 'Updated Task 1 Title',
      status: 'done',
    };
    // Simulate server response WITHOUT projectId, as seen in your issue
    const responseDtoWithoutProjectId = {
      id: 't1',
      title: 'Updated Task 1 Title',
      description: 'Desc 1', // Existing description preserved by server
      status: 'done',
      dueDate: '2025-07-01',
      // NO projectId field in this simulated response
    };
    // The expected final task should *still* have projectId from originalTask
    const expectedUpdatedTask: Task = { ...mockTask1, ...updateDto, id: 't1' };

    apiServiceSpy.patch.and.returnValue(of(responseDtoWithoutProjectId)); // Use patch

    service.updateTask(mockTask1.id, updateDto).subscribe((task) => {
      // The task returned from the service should also have the projectId
      expect(task.projectId).toBe(mockTask1.projectId);
      expect(service.tasks()).toEqual([expectedUpdatedTask]); // Check signal content
      expect(apiServiceSpy.patch).toHaveBeenCalledWith(
        `tasks/${mockTask1.id}`,
        updateDto
      );
      done();
    });
  });

  it('should delete a task and remove it from the tasks signal', (done) => {
    // Seed initial state
    service['_tasks'].set([mockTask1, mockTask2]);

    apiServiceSpy.delete.and.returnValue(of(null));

    service.deleteTask(mockTask1.id).subscribe(() => {
      expect(service.tasks()).toEqual([mockTask2]);
      expect(apiServiceSpy.delete).toHaveBeenCalledWith(
        `tasks/${mockTask1.id}`
      );
      done();
    });
  });

  it('should clear the tasks signal', () => {
    service['_tasks'].set([mockTask1]);
    expect(service.tasks().length).toBe(1);
    service.clearTasks();
    expect(service.tasks()).toEqual([]);
  });

  // Test filteredTasks (filter by text)
  it('should filter tasks by title/description text', () => {
    service['_tasks'].set([
      mockTask1,
      mockTask2,
      { ...mockTask1, id: 't3', title: 'Another todo task' },
    ]);
    service.filterText.set('task 1'); // Case-insensitive filter

    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([mockTask1]);

    service.filterText.set('another');
    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()[0].id).toBe('t3');
  });

  // Test filteredTasks (filter by status)
  it('should filter tasks by status', () => {
    service['_tasks'].set([mockTask1, mockTask2]); // t1: todo, t2: in_progress
    service.statusFilter.set('in_progress');

    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([mockTask2]);
  });

  // Test filteredTasks (combined filters)
  it('should filter tasks by text and status combined', () => {
    service['_tasks'].set([
      mockTask1, // Task 1, todo
      mockTask2, // Task 2, in_progress
      { ...mockTask1, id: 't3', title: 'Another todo task', status: 'todo' },
      {
        ...mockTask2,
        id: 't4',
        title: 'Another in_progress task',
        status: 'in_progress',
      },
    ]);

    service.filterText.set('another');
    service.statusFilter.set('todo');

    expect(service.filteredTasks().length).toBe(1);
    expect(service.filteredTasks()).toEqual([
      { ...mockTask1, id: 't3', title: 'Another todo task', status: 'todo' },
    ]);
  });
});
