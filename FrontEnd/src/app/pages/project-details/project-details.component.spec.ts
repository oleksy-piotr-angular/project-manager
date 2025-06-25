import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError, Observable } from 'rxjs'; // Import Observable here
import { signal, WritableSignal } from '@angular/core';
import { TaskStatus } from '../../models/task.model';

import { ProjectDetailsComponent } from './project-details.component';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Project, ProjectStatus } from '../../models/project.model';
import { Task } from '../../models/task.model';
import { User } from '../../models/user.model';
import { UserMapper } from '../../mappers/user.mapper';
import { ApiService } from '../../services/api.service';

// --- Mocks ---
const mockProject: Project = {
  id: 'p1',
  userId: 'u1',
  name: 'Test Project',
  description: 'Project description',
  status: ProjectStatus.Active,
};

const mockTasks: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Task 1',
    description: 'Desc 1',
    status: 'todo',
    dueDate: '2025-07-01',
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'Task 2',
    description: 'Desc 2',
    status: 'in_progress',
    dueDate: '2025-07-15',
  },
];

const mockUser: User = UserMapper.fromDto({
  id: 'u1',
  username: 'testuser',
  email: 'test@example.com',
  password: 'pwd',
});

// --- Unit Tests (with mock services) ---
describe('ProjectDetailsComponent - Unit Tests', () => {
  let component: ProjectDetailsComponent;
  let fixture: ComponentFixture<ProjectDetailsComponent>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let activatedRouteStub: any;
  let routerSpy: jasmine.SpyObj<Router>;

  // Writable signal used internally by the TaskService spy to simulate updates
  let testTasksSignal: WritableSignal<Task[]>;

  beforeEach(async () => {
    // Initialize the writable signal before creating the spy
    testTasksSignal = signal<Task[]>([]);

    projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      ['getProjectById', 'updateProject', 'deleteProject', 'clearProjects'],
      {
        projects: signal([]),
        filterText: signal(''),
        statusFilter: signal('all'),
        filteredProjects: signal([]),
      }
    );

    // Pass the readonly view of testTasksSignal to the spy
    taskServiceSpy = jasmine.createSpyObj(
      'TaskService',
      ['loadTasks', 'createTask', 'updateTask', 'deleteTask', 'clearTasks'],
      {
        tasks: testTasksSignal.asReadonly(),
        filterText: signal(''),
        statusFilter: signal('all'),
        filteredTasks: signal([]),
      }
    );

    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(true),
      currentUser: signal(mockUser),
    });
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    activatedRouteStub = {
      paramMap: new Subject(),
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? mockProject.id : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: TaskService, useValue: taskServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailsComponent);
    component = fixture.componentInstance;

    // Configure spy return values for initial data loading
    projectServiceSpy.getProjectById.and.returnValue(of(mockProject));
    taskServiceSpy.loadTasks.and.returnValue(of(mockTasks));

    // Configure callFakes to use the writable testTasksSignal
    taskServiceSpy.createTask.and.callFake((dto) => {
      const newTask: Task = {
        id: 'newId',
        ...dto,
        projectId: mockProject.id,
        dueDate: dto.dueDate || '',
      };
      testTasksSignal.update((tasks) => [...tasks, newTask]);
      return of(newTask);
    });
    taskServiceSpy.updateTask.and.callFake((id, dto) => {
      let updatedTask: Task | undefined;
      testTasksSignal.update((tasks) => {
        return tasks.map((task) => {
          if (task.id === id) {
            updatedTask = { ...task, ...dto };
            return updatedTask;
          }
          return task;
        });
      });
      return of(updatedTask!);
    });
    taskServiceSpy.deleteTask.and.callFake((id) => {
      testTasksSignal.update((tasks) => tasks.filter((task) => task.id !== id));
      return of(undefined);
    });
    // Ensure clearTasks also affects the testTasksSignal
    taskServiceSpy.clearTasks.and.callFake(() => {
      testTasksSignal.set([]);
    });

    // Manually trigger the effect by emitting a value for paramMap, as the effect is in constructor.
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? mockProject.id : null),
    });

    // Set initial tasks state for tests that don't start with loadTasks
    testTasksSignal.set(mockTasks);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load project and tasks on init', fakeAsync(() => {
    // Reset testTasksSignal for this specific test to ensure loadTasks actually populates it
    testTasksSignal.set([]);
    projectServiceSpy.getProjectById.and.returnValue(of(mockProject));
    taskServiceSpy.loadTasks.and.returnValue(of(mockTasks));

    // Re-trigger the effect to re-run load logic
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? mockProject.id : null),
    });
    fixture.detectChanges();
    tick();

    expect(projectServiceSpy.getProjectById).toHaveBeenCalledWith(
      mockProject.id
    );
    expect(taskServiceSpy.loadTasks).toHaveBeenCalledWith(mockProject.id);
    expect(component.project()).toEqual(mockProject);
    expect(taskServiceSpy.tasks()).toEqual(mockTasks);
    expect(testTasksSignal()).toEqual(mockTasks);
  }));

  it('should navigate to dashboard if project not found', fakeAsync(() => {
    projectServiceSpy.getProjectById.and.returnValue(of(undefined));
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? mockProject.id : null),
    });
    fixture.detectChanges();
    tick();

    expect(projectServiceSpy.getProjectById).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.project()).toBeUndefined();
  }));

  it('should set error message if project loading fails', fakeAsync(() => {
    // 1. Make sure the mock returns an error
    projectServiceSpy.getProjectById.and.returnValue(
      throwError(() => new Error('Project load error'))
    );
    // 2. Spy console.error
    spyOn(console, 'error');

    // 3. Trigger a change ActivatedRoute (projectId)
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? mockProject.id : null),
    });

    // 4. Detect changes and pass the time
    fixture.detectChanges(); // Should trigger an effect
    tick(); // Allow the subscription to end with an error

    // Potentially, if effect or subscription has additional microtasks, we need another tick()

    // Although rare, worth a try for diagnostics

    // fixture.detectChanges(); // Optional if previous tick() didn't catch all changes

    // tick(); // Optional if previous tick() didn't catch all changes

    // Assertions
    expect(projectServiceSpy.getProjectById).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Failed to load project details:',
      jasmine.any(Error) // We still expect any Error object
    );
    expect(component.project()).toBeUndefined();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should open task form for creation', () => {
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();

    component.openAddTaskForm();

    expect(component.showTaskForm()).toBeTrue();
    expect(component.editingTask()).toBeUndefined();
  });

  it('should open task form for editing', () => {
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();

    component.editTask(mockTasks[0]);

    expect(component.showTaskForm()).toBeTrue();
    expect(component.editingTask()).toEqual(mockTasks[0]);
  });

  it('should close task form on cancel', () => {
    component.showTaskForm.set(true);
    component.editingTask.set(mockTasks[0]);
    component.onTaskFormCancel();
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();
  });

  it('should create a task on form save', fakeAsync(() => {
    const newTaskData = {
      title: 'New Task from Form',
      description: 'Desc from form',
      status: 'todo' as TaskStatus,
      dueDate: '2025-08-01',
    };
    spyOn(window, 'alert');

    component.projectId = mockProject.id;
    component.onTaskFormSave(newTaskData);

    tick();
    expect(taskServiceSpy.createTask).toHaveBeenCalledWith(
      jasmine.objectContaining({
        projectId: mockProject.id,
        title: newTaskData.title,
      })
    );
    expect(testTasksSignal().length).toBe(mockTasks.length + 1);
    expect(testTasksSignal()).toContain(
      jasmine.objectContaining({ title: newTaskData.title })
    );
    expect(window.alert).toHaveBeenCalledWith('Task added successfully!');
    expect(component.showTaskForm()).toBeFalse();
  }));

  it('should update a task on form save', fakeAsync(() => {
    const updatedTaskData = {
      title: 'Updated Task Title',
      description: 'Updated Desc',
      status: 'done' as TaskStatus,
      dueDate: '2025-07-01',
    };
    spyOn(window, 'alert');

    component.editingTask.set(mockTasks[0]);
    component.projectId = mockProject.id;
    component.onTaskFormSave(updatedTaskData);

    tick();
    expect(taskServiceSpy.updateTask).toHaveBeenCalledWith(
      mockTasks[0].id,
      jasmine.objectContaining(updatedTaskData)
    );
    expect(testTasksSignal()).toContain(
      jasmine.objectContaining({ title: updatedTaskData.title, status: 'done' })
    );
    expect(window.alert).toHaveBeenCalledWith('Task updated successfully!');
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();
  }));

  it('should delete a task', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.deleteTask(mockTasks[0].id);
    tick();

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this task?'
    );
    expect(taskServiceSpy.deleteTask).toHaveBeenCalledWith(mockTasks[0].id);
    expect(testTasksSignal().length).toBe(mockTasks.length - 1);
    expect(testTasksSignal()).not.toContain(mockTasks[0]);
    expect(window.alert).toHaveBeenCalledWith('Task deleted successfully!');
  }));

  it('should not delete a task if confirmation is denied', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(false);
    taskServiceSpy.deleteTask.and.callThrough();

    component.deleteTask(mockTasks[0].id);
    tick();

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this task?'
    );
    expect(taskServiceSpy.deleteTask).not.toHaveBeenCalled();
  }));

  it('should display task status correctly', () => {
    expect(component.getTaskStatusDisplayName('todo')).toBe('Todo');
    expect(component.getTaskStatusDisplayName('in_progress')).toBe(
      'In Progress'
    );
    expect(component.getTaskStatusDisplayName('done')).toBe('Done');
  });

  it('should navigate back to dashboard', () => {
    component.goBackToDashboard();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});

// --- Integration Tests (using real services, but still controlled dependencies like ApiService) ---
describe('ProjectDetailsComponent - Integration Tests', () => {
  let component: ProjectDetailsComponent;
  let fixture: ComponentFixture<ProjectDetailsComponent>;
  let projectService: ProjectService;
  let taskService: TaskService;
  let authService: AuthService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let activatedRouteStub: any;
  let routerSpy: jasmine.SpyObj<Router>;

  const initialProject: Project = {
    id: 'p1_int',
    userId: 'u1_int',
    name: 'Integration Project',
    description: 'Integration project description',
    status: ProjectStatus.Active,
  };

  const initialTasks: Task[] = [
    {
      id: 't1_int',
      projectId: 'p1_int',
      title: 'Integration Task 1',
      description: 'Int Desc 1',
      status: 'todo',
      dueDate: '2025-07-01',
    },
    {
      id: 't2_int',
      projectId: 'p1_int',
      title: 'Integration Task 2',
      description: 'Int Desc 2',
      status: 'in_progress',
      dueDate: '2025-07-15',
    },
  ];

  const mockUserForIntTest: User = UserMapper.fromDto({
    id: 'u1_int',
    username: 'intuser',
    email: 'int@example.com',
    password: 'pwd',
  });

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    activatedRouteStub = {
      paramMap: new Subject(),
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'id' ? initialProject.id : null),
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [ProjectDetailsComponent],
      providers: [
        { provide: ActivatedRoute, useValue: activatedRouteStub },
        { provide: Router, useValue: routerSpy },
        ProjectService,
        TaskService,
        AuthService,
        { provide: ApiService, useValue: apiServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailsComponent);
    component = fixture.componentInstance;
    projectService = TestBed.inject(ProjectService);
    taskService = TestBed.inject(TaskService);
    authService = TestBed.inject(AuthService);

    // Mock ApiService responses - KEY CHANGE HERE
    apiServiceSpy.get.and.callFake(<T>(path: string): Observable<T> => {
      if (path.includes(`projects/${initialProject.id}`)) {
        return of(initialProject as T);
      }
      if (path.includes(`tasks?projectId=${initialProject.id}`)) {
        return of(initialTasks as T);
      }
      // Provide a default empty array for other generic get calls if needed, or refine based on actual API calls
      return of([] as T);
    });
    apiServiceSpy.post.and.callFake((path, body) =>
      of({ id: 'newId', ...body })
    );
    apiServiceSpy.patch.and.callFake((path, body) =>
      of({ id: path.split('/').pop(), ...body })
    );
    apiServiceSpy.delete.and.returnValue(of(undefined));

    spyOn(authService.currentUser, 'set').and.callThrough();
    spyOn(authService.isAuthenticated, 'set').and.callThrough();
    authService.currentUser.set(mockUserForIntTest);
    authService.isAuthenticated.set(true);

    // Trigger the effect by emitting a value
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? initialProject.id : null),
    });

    fixture.detectChanges();
  });

  it('should load project and tasks and update component signals correctly', fakeAsync(() => {
    expect(component.project()).toEqual(initialProject);
    expect(taskService.tasks()).toEqual(initialTasks);
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();
  }));

  it('should allow creating a new task via form and update the task list', fakeAsync(() => {
    const newTaskData = {
      title: 'New Integration Task',
      description: 'New Int Desc',
      status: 'todo' as TaskStatus,
      dueDate: '2025-09-01',
    };
    spyOn(window, 'alert');

    component.projectId = initialProject.id;
    component.openAddTaskForm();
    fixture.detectChanges();

    component.onTaskFormSave(newTaskData);
    tick();

    expect(apiServiceSpy.post).toHaveBeenCalledWith(
      'tasks',
      jasmine.objectContaining({
        projectId: initialProject.id,
        title: newTaskData.title,
      })
    );
    expect(taskService.tasks().length).toBe(initialTasks.length + 1);
    expect(taskService.tasks()).toContain(
      jasmine.objectContaining({ title: newTaskData.title })
    );
    expect(window.alert).toHaveBeenCalledWith('Task added successfully!');
    expect(component.showTaskForm()).toBeFalse();
  }));

  it('should allow updating an existing task via form and update the task list', fakeAsync(() => {
    const updatedTitle = 'Updated Int Task 1';
    const updatedTaskData = {
      id: initialTasks[0].id,
      title: updatedTitle,
      description: initialTasks[0].description,
      status: 'done' as TaskStatus,
      dueDate: initialTasks[0].dueDate,
    };
    spyOn(window, 'alert');

    component.projectId = initialProject.id;
    component.editTask(initialTasks[0]);
    fixture.detectChanges();

    component.onTaskFormSave(updatedTaskData);
    tick();

    expect(apiServiceSpy.patch).toHaveBeenCalledWith(
      `tasks/${initialTasks[0].id}`,
      jasmine.objectContaining({ title: updatedTitle })
    );
    expect(taskService.tasks()).toContain(
      jasmine.objectContaining({ title: updatedTitle, status: 'done' })
    );
    expect(window.alert).toHaveBeenCalledWith('Task updated successfully!');
    expect(component.showTaskForm()).toBeFalse();
  }));

  it('should allow deleting a task and update the task list', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.deleteTask(initialTasks[0].id);
    tick();

    expect(apiServiceSpy.delete).toHaveBeenCalledWith(
      `tasks/${initialTasks[0].id}`
    );
    expect(taskService.tasks().length).toBe(initialTasks.length - 1);
    expect(taskService.tasks()).not.toContain(initialTasks[0]);
    expect(window.alert).toHaveBeenCalledWith('Task deleted successfully!');
  }));
});
