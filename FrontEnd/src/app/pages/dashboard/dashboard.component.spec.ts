import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { Router } from '@angular/router';
import { Project } from '../../models/project.model';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { User } from '../../models/user.model';
import { UserMapper } from '../../mappers/user.mapper';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockUser: User = UserMapper.fromDto({
    id: 'u1',
    username: 'test',
    email: 'test@test.com',
    password: 'pwd',
  });
  const mockProjects: Project[] = [
    {
      id: 'p1',
      userId: 'u1',
      name: 'Project A',
      description: 'Desc A',
      status: 'active',
    },
    {
      id: 'p2',
      userId: 'u1',
      name: 'Project B',
      description: 'Desc B',
      status: 'on_hold',
    },
  ];

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(false),
      currentUser: signal(null),
    });
    projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      ['loadProjects'],
      {
        projects: signal([]),
        filterText: signal(''),
        statusFilter: signal('all'),
        filteredProjects: signal([]),
      }
    );
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.logout and navigate to /login on logout', () => {
    component.logout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should open create project modal', () => {
    component.openCreateProjectModal();
    expect(component.showProjectForm()).toBeTrue();
    expect(component.editingProject()).toBeUndefined();
  });

  it('should close project form on cancel', () => {
    component.showProjectForm.set(true);
    component.onProjectFormCancel();
    expect(component.showProjectForm()).toBeFalse();
  });

  it('should close project form and reload projects on save', fakeAsync(() => {
    authServiceSpy.currentUser.set(mockUser);
    projectServiceSpy.loadProjects.and.returnValue(of(mockProjects));

    component.showProjectForm.set(true);
    component.onProjectFormSave();
    tick();

    expect(component.showProjectForm()).toBeFalse();
    expect(projectServiceSpy.loadProjects).toHaveBeenCalledWith(mockUser.id);
  }));

  it('should load projects when user is authenticated and currentUser is available', fakeAsync(() => {
    projectServiceSpy.loadProjects.and.returnValue(of(mockProjects));

    authServiceSpy.isAuthenticated.set(true);
    authServiceSpy.currentUser.set(mockUser);
    fixture.detectChanges();

    tick();

    expect(projectServiceSpy.loadProjects).toHaveBeenCalledWith(mockUser.id);
  }));

  it('should not load projects if user is not authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.set(false);
    authServiceSpy.currentUser.set(null);
    fixture.detectChanges();
    tick();

    expect(projectServiceSpy.loadProjects).not.toHaveBeenCalled();
  }));

  it('should not load projects if currentUser is null even if authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.set(true);
    authServiceSpy.currentUser.set(null);
    fixture.detectChanges();
    tick();

    expect(projectServiceSpy.loadProjects).not.toHaveBeenCalled();
  }));
});
