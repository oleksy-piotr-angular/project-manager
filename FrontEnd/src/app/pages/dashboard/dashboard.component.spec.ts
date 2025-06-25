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
import { Project } from '../../models/project.model'; // For type annotation only
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { User } from '../../models/user.model'; // For type annotation only
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
  }); // User used for type annotation
  const mockProjects: Project[] = [
    // Project used for type annotation
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
    // Create spy objects for AuthService, ProjectService, and Router
    authServiceSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      isAuthenticated: signal(false), // Initial state for isAuthenticated signal
      currentUser: signal(null), // Initial state for currentUser signal
    });
    projectServiceSpy = jasmine.createSpyObj(
      'ProjectService',
      ['loadProjects'],
      {
        projects: signal([]), // Initial state for projects signal
        filterText: signal(''),
        statusFilter: signal('all'),
        filteredProjects: signal([]), // Initial state for filteredProjects signal
      }
    );
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy }, // Provide AuthService spy
        { provide: ProjectService, useValue: projectServiceSpy }, // Provide ProjectService spy
        { provide: Router, useValue: routerSpy }, // Provide Router spy
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Initialize the component
  });

  // Test that the component is created successfully.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test logout functionality: call authService.logout and navigate to login page.
  it('should call authService.logout and navigate to /login on logout', () => {
    component.logout(); // Call the logout method
    expect(authServiceSpy.logout).toHaveBeenCalled(); // Verify authService.logout was called
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']); // Verify navigation
  });

  // Test opening the create project modal.
  it('should open create project modal', () => {
    component.openCreateProjectModal(); // Call method to open modal
    expect(component.showProjectForm()).toBeTrue(); // Verify form visibility signal
    expect(component.editingProject()).toBeUndefined(); // Verify no project is set for editing
  });

  // Test closing the project form on cancel.
  it('should close project form on cancel', () => {
    component.showProjectForm.set(true); // Simulate form being open
    component.onProjectFormCancel(); // Call cancel method
    expect(component.showProjectForm()).toBeFalse(); // Verify form visibility signal
  });

  // Test handling of project form save: close form and reload projects.
  it('should close project form and reload projects on save', fakeAsync(() => {
    authServiceSpy.currentUser.set(mockUser); // Set current user for project loading
    projectServiceSpy.loadProjects.and.returnValue(of(mockProjects)); // Mock project loading success

    component.showProjectForm.set(true); // Simulate form being open
    component.onProjectFormSave(); // Call save method
    tick(); // Advance time for async operations

    expect(component.showProjectForm()).toBeFalse(); // Form should close
    expect(projectServiceSpy.loadProjects).toHaveBeenCalledWith(mockUser.id); // Verify projects were reloaded for the current user
  }));

  // Test that projects are loaded when the user is authenticated and available.
  it('should load projects when user is authenticated and currentUser is available', fakeAsync(() => {
    projectServiceSpy.loadProjects.and.returnValue(of(mockProjects)); // Mock project loading success

    authServiceSpy.isAuthenticated.set(true); // Set authenticated state
    authServiceSpy.currentUser.set(mockUser); // Set current user
    fixture.detectChanges(); // Trigger change detection
    tick(); // Advance time for async operations

    expect(projectServiceSpy.loadProjects).toHaveBeenCalledWith(mockUser.id); // Verify projects were loaded
  }));

  // Test that projects are NOT loaded if the user is not authenticated.
  it('should not load projects if user is not authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.set(false); // Set unauthenticated state
    authServiceSpy.currentUser.set(null); // Set no current user
    fixture.detectChanges(); // Trigger change detection
    tick(); // Advance time

    expect(projectServiceSpy.loadProjects).not.toHaveBeenCalled(); // Verify projects were NOT loaded
  }));

  // Test that projects are NOT loaded if currentUser is null, even if isAuthenticated is true (edge case).
  it('should not load projects if currentUser is null even if authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.set(true); // Set authenticated state
    authServiceSpy.currentUser.set(null); // Set no current user (but isAuthenticated is true)
    fixture.detectChanges(); // Trigger change detection
    tick(); // Advance time

    expect(projectServiceSpy.loadProjects).not.toHaveBeenCalled(); // Verify projects were NOT loaded
  }));
});
