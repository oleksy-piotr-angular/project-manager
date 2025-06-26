import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProjectDetailsComponent } from './project-details.component';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Project, ProjectStatus } from '../../models/project.model';
import { Task, TaskStatus } from '../../models/task.model';
import { User } from '../../models/user.model';
import { TaskFormComponent } from '../../components/task-form/task-form.component';

describe('ProjectDetailsComponent', () => {
  let fixture: ComponentFixture<ProjectDetailsComponent>;
  let component: ProjectDetailsComponent;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let taskServiceSpy: jasmine.SpyObj<TaskService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let activatedRouteStub: any;
  let testTasksSignal: WritableSignal<Task[]>;

  // Mock data
  const mockProject: Project = {
    id: 'p1',
    userId: 'u1',
    name: 'Test Project',
    description: 'Project description',
    status: ProjectStatus.Active,
  };

  const mockUser: User = {
    id: 'u1',
    email: 'test@example.com',
    name: 'Test User',
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

  beforeEach(fakeAsync(() => {
    testTasksSignal = signal<Task[]>([...mockTasks]);

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

    TestBed.configureTestingModule({
      imports: [ProjectDetailsComponent, CommonModule, TaskFormComponent],
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

    // Default spy behaviors
    projectServiceSpy.getProjectById.and.returnValue(of(mockProject));
    taskServiceSpy.loadTasks.and.callFake(() => {
      testTasksSignal.set([...mockTasks]);
      return of(mockTasks);
    });
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
      testTasksSignal.update((tasks) =>
        tasks.map((task) => {
          if (task.id === id) {
            updatedTask = { ...task, ...dto };
            return updatedTask;
          }
          return task;
        })
      );
      return of(updatedTask!);
    });
    taskServiceSpy.deleteTask.and.callFake((id) => {
      testTasksSignal.update((tasks) => tasks.filter((task) => task.id !== id));
      return of(undefined);
    });

    // Initial paramMap emission to trigger effect
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? mockProject.id : null),
    });

    fixture.detectChanges();
    tick();
  }));

  afterEach(() => {
    routerSpy.navigate.calls.reset();
    projectServiceSpy.getProjectById.calls.reset();
    taskServiceSpy.loadTasks.calls.reset();
    taskServiceSpy.createTask.calls.reset();
    taskServiceSpy.updateTask.calls.reset();
    taskServiceSpy.deleteTask.calls.reset();
  });

  // ----------- EFFECTS & SIGNALS -----------
  it('should load project and tasks on init', fakeAsync(() => {
    expect(component.project()).toEqual(mockProject);
    expect(component.tasks()).toEqual(mockTasks);
    expect(projectServiceSpy.getProjectById).toHaveBeenCalledWith(
      mockProject.id
    );
    expect(taskServiceSpy.loadTasks).toHaveBeenCalledWith(mockProject.id);
  }));

  it('should navigate to dashboard if project not found', fakeAsync(() => {
    projectServiceSpy.getProjectById.and.returnValue(of(undefined));
    component.project.set(undefined); // <-- Reset signal state
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? 'notfound' : null),
    });
    fixture.detectChanges();
    tick();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.project()).toBeUndefined();
  }));

  it('should handle project loading error and navigate to dashboard', fakeAsync(() => {
    const errorSpy = spyOn(console, 'error');
    projectServiceSpy.getProjectById.and.returnValue(
      throwError(() => new Error('Project load error'))
    );
    authServiceSpy.currentUser.set(mockUser);

    // Emit a new paramMap to trigger the effect again
    (activatedRouteStub.paramMap as Subject<any>).next({
      get: (key: string) => (key === 'id' ? 'error-case' : null),
    });

    fixture.detectChanges();
    tick();

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to load project details:',
      jasmine.any(Error)
    );
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.project()).toBeUndefined();
  }));

  // ----------- PUBLIC METHODS -----------
  it('should open task form for creation', () => {
    component.openAddTaskForm();
    expect(component.showTaskForm()).toBeTrue();
    expect(component.editingTask()).toBeUndefined();
  });

  it('should open task form for editing', () => {
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
    spyOn(window, 'alert');
    component.projectId = mockProject.id;
    component.onTaskFormSave({
      title: 'New Task',
      description: 'Desc',
      status: 'todo',
      dueDate: '2025-08-01',
    });
    tick();
    expect(taskServiceSpy.createTask).toHaveBeenCalled();
    expect(component.showTaskForm()).toBeFalse();
    expect(window.alert).toHaveBeenCalledWith('Task added successfully!');
    expect(component.tasks().length).toBe(mockTasks.length + 1);
  }));

  it('should update a task on form save', fakeAsync(() => {
    spyOn(window, 'alert');
    component.editingTask.set(mockTasks[0]);
    component.projectId = mockProject.id;
    component.onTaskFormSave({
      title: 'Updated Task',
      description: 'Updated Desc',
      status: 'done',
      dueDate: '2025-07-01',
    });
    tick();
    expect(taskServiceSpy.updateTask).toHaveBeenCalled();
    expect(component.showTaskForm()).toBeFalse();
    expect(component.editingTask()).toBeUndefined();
    expect(window.alert).toHaveBeenCalledWith('Task updated successfully!');
    expect(component.tasks()).toContain(
      jasmine.objectContaining({ title: 'Updated Task', status: 'done' })
    );
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
    expect(window.alert).toHaveBeenCalledWith('Task deleted successfully!');
    expect(component.tasks().length).toBe(mockTasks.length - 1);
  }));

  it('should not delete a task if confirmation is denied', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.deleteTask(mockTasks[0].id);
    tick();
    expect(taskServiceSpy.deleteTask).not.toHaveBeenCalled();
  }));

  it('should return correct display name for task status', () => {
    expect(component.getTaskStatusDisplayName('todo')).toBe('Todo');
    expect(component.getTaskStatusDisplayName('in_progress')).toBe(
      'In progress'
    );
    expect(component.getTaskStatusDisplayName('done')).toBe('Done');
  });

  it('should navigate back to dashboard', () => {
    component.goBackToDashboard();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  // ----------- TEMPLATE TESTS (SHALLOW) -----------
  it('should render project name and description in template', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(mockProject.name);
    expect(compiled.textContent).toContain(mockProject.description);
  }));

  it('should render tasks in template', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain(mockTasks[0].title);
    expect(compiled.textContent).toContain(mockTasks[1].title);
  }));

  it('should show task form when showTaskForm is true', fakeAsync(() => {
    component.showTaskForm.set(true);
    fixture.detectChanges();
    tick();
    const form = fixture.nativeElement.querySelector('app-task-form');
    expect(form).not.toBeNull();
  }));
});
