import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectFormComponent } from './project-form.component';
import { Project, ProjectStatus } from '../../models/project.model';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ProjectService } from '../../services/project.service';
import { User } from '../../models/user.model';
import { UserMapper } from '../../mappers/user.mapper';
import { CreateProjectDto, UpdateProjectDto } from '../../dtos/project.dto';
import { Component, DebugElement, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';

// --- Test Host Component ---
@Component({
  template: `
    <app-project-form
      [project]="hostProject"
      (save)="onSave()"
      (cancel)="onCancel()"
    >
    </app-project-form>
  `,
  standalone: true,
  imports: [ProjectFormComponent],
})
class TestHostComponent {
  hostProject: Project | undefined;
  saved = false;
  cancelled = false;

  onSave() {
    this.saved = true;
  }
  onCancel() {
    this.cancelled = true;
  }
}

describe('ProjectFormComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let component: ProjectFormComponent;
  let projectServiceSpy: jasmine.SpyObj<ProjectService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let currentUserWritableSignal: WritableSignal<User | null>;

  const mockUser: User = UserMapper.fromDto({
    id: 'u1',
    username: 'testuser',
    email: 'test@test.com',
    password: 'pwd',
  });

  beforeEach(async () => {
    projectServiceSpy = jasmine.createSpyObj('ProjectService', [
      'createProject',
      'updateProject',
    ]);

    currentUserWritableSignal = signal<User | null>(mockUser);

    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: currentUserWritableSignal.asReadonly(),
    });

    await TestBed.configureTestingModule({
      imports: [ProjectFormComponent, ReactiveFormsModule, TestHostComponent],
      providers: [
        { provide: ProjectService, useValue: projectServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    const projectFormDebugElement: DebugElement =
      hostFixture.debugElement.query(By.directive(ProjectFormComponent));
    component = projectFormDebugElement.componentInstance;

    projectServiceSpy.createProject.and.returnValue(
      of({
        id: 'newId',
        name: 'New Test',
        description: 'Desc',
        status: ProjectStatus.Active,
        userId: mockUser.id,
      })
    );
    projectServiceSpy.updateProject.and.returnValue(
      of({
        id: 'p1',
        name: 'Updated Test',
        description: 'Desc',
        status: ProjectStatus.OnHold,
        userId: mockUser.id,
      })
    );

    hostFixture.detectChanges();
  });

  // Test that the component is created successfully.
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test form initialization for creation mode.
  it('should initialize form for creation mode', fakeAsync(() => {
    hostComponent.hostProject = undefined;
    hostFixture.detectChanges();
    tick();

    expect(component.projectForm).toBeDefined();
    expect(component.projectForm.value).toEqual({
      name: '',
      description: '',
      status: ProjectStatus.Active,
    });
    expect(component.projectForm.valid).toBeFalse();
    expect(component.isEditing()).toBeFalse();
  }));

  // Test form initialization for editing mode with an existing project.
  it('should initialize form for editing mode with existing project', fakeAsync(() => {
    const editProject: Project = {
      id: 'p1',
      userId: 'u1',
      name: 'Edit Proj',
      description: 'Edit Desc',
      status: ProjectStatus.OnHold,
    };
    hostComponent.hostProject = editProject;
    hostFixture.detectChanges();
    tick();

    expect(component.projectForm.value).toEqual({
      name: editProject.name,
      description: editProject.description,
      status: editProject.status,
    });
    expect(component.projectForm.valid).toBeTrue();
    expect(component.isEditing()).toBeTrue();
  }));

  // Test form validity with valid data.
  it('should be valid with valid data', () => {
    component.projectForm.controls['name'].setValue('Valid Name');
    component.projectForm.controls['description'].setValue('Valid Description');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);
    expect(component.projectForm.valid).toBeTrue();
  });

  // Test form validity with missing name.
  it('should be invalid with missing name', () => {
    component.projectForm.controls['name'].setValue('');
    component.projectForm.controls['description'].setValue('Valid Description');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);
    expect(component.projectForm.invalid).toBeTrue();
    expect(
      component.projectForm.controls['name'].hasError('required')
    ).toBeTrue();
  });

  // Test form validity with missing description.
  it('should be invalid with missing description', () => {
    component.projectForm.controls['name'].setValue('Valid Name');
    component.projectForm.controls['description'].setValue('');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);
    expect(component.projectForm.invalid).toBeTrue();
    expect(
      component.projectForm.controls['description'].hasError('required')
    ).toBeTrue();
  });

  // Test project creation on form submission.
  it('should emit save and call createProject on valid submission in creation mode', fakeAsync(() => {
    spyOn(window, 'alert');
    hostComponent.hostProject = undefined;
    hostFixture.detectChanges();
    tick();

    component.projectForm.controls['name'].setValue('New Project');
    component.projectForm.controls['description'].setValue('New Desc');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);

    component.onSubmit();
    tick();

    const expectedCreateDto: CreateProjectDto = {
      name: 'New Project',
      description: 'New Desc',
      status: ProjectStatus.Active,
      userId: mockUser.id,
    };

    expect(projectServiceSpy.createProject).toHaveBeenCalledWith(
      expectedCreateDto
    );
    expect(hostComponent.saved).toBeTrue();
    expect(window.alert).toHaveBeenCalledWith('Project added successfully!');
    expect(component.projectForm.value.name).toBeNull();
  }));

  // Test project update on form submission.
  it('should emit save and call updateProject on valid submission in editing mode', fakeAsync(() => {
    const editProject: Project = {
      id: 'p1',
      userId: 'u1',
      name: 'Original Name',
      description: 'Original Desc',
      status: ProjectStatus.Active,
    };
    hostComponent.hostProject = editProject;
    hostFixture.detectChanges();
    tick();

    spyOn(window, 'alert');

    component.projectForm.controls['name'].setValue('Updated Name');
    component.projectForm.controls['description'].setValue('Updated Desc');
    component.projectForm.controls['status'].setValue(ProjectStatus.OnHold);

    component.onSubmit();
    tick();

    const expectedUpdateDto: UpdateProjectDto = {
      name: 'Updated Name',
      description: 'Updated Desc',
      status: ProjectStatus.OnHold,
    };

    expect(projectServiceSpy.updateProject).toHaveBeenCalledWith(
      editProject.id,
      expectedUpdateDto
    );
    expect(hostComponent.saved).toBeTrue();
    expect(window.alert).toHaveBeenCalledWith('Project updated successfully!');
  }));

  // Test error handling for project creation.
  it('should handle error during project creation', fakeAsync(() => {
    projectServiceSpy.createProject.and.returnValue(
      throwError(() => new Error('Creation failed'))
    );
    hostComponent.hostProject = undefined;
    hostFixture.detectChanges();
    tick();

    component.projectForm.controls['name'].setValue('New Project');
    component.projectForm.controls['description'].setValue('New Desc');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);

    component.onSubmit();
    tick();

    expect(projectServiceSpy.createProject).toHaveBeenCalled();
    expect(component.formError).toBe('Add error: Creation failed');
    expect(hostComponent.saved).toBeFalse();
  }));

  // Test error handling for project update.
  it('should handle error during project update', fakeAsync(() => {
    const editProject: Project = {
      id: 'p1',
      userId: 'u1',
      name: 'Original Name',
      description: 'Original Desc',
      status: ProjectStatus.Active,
    };
    hostComponent.hostProject = editProject;
    hostFixture.detectChanges();
    tick();

    projectServiceSpy.updateProject.and.returnValue(
      throwError(() => new Error('Update failed'))
    );

    component.projectForm.controls['name'].setValue('Updated Name');
    component.projectForm.controls['description'].setValue('Updated Desc');
    component.projectForm.controls['status'].setValue(ProjectStatus.OnHold);

    component.onSubmit();
    tick();

    expect(projectServiceSpy.updateProject).toHaveBeenCalled();
    expect(component.formError).toBe('Update error: Update failed');
    expect(hostComponent.saved).toBeFalse();
  }));

  // Test that onSubmit does not proceed if form is invalid.
  it('should not submit if form is invalid', () => {
    expect(projectServiceSpy.createProject).not.toHaveBeenCalled();
    expect(projectServiceSpy.updateProject).not.toHaveBeenCalled();

    component.projectForm.controls['name'].setValue('');
    component.projectForm.controls['description'].setValue('');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);

    component.onSubmit();

    expect(hostComponent.saved).toBeFalse();
    expect(projectServiceSpy.createProject).not.toHaveBeenCalled();
    expect(projectServiceSpy.updateProject).not.toHaveBeenCalled();
    expect(component.formError).toBeNull();
  });

  // Test that onSubmit handles missing user ID
  it('should set formError if currentUserId is not available', fakeAsync(() => {
    currentUserWritableSignal.set(null);

    hostComponent.hostProject = undefined;
    hostFixture.detectChanges();
    tick();

    component.projectForm.controls['name'].setValue('Test');
    component.projectForm.controls['description'].setValue('Test');
    component.projectForm.controls['status'].setValue(ProjectStatus.Active);

    component.onSubmit();
    tick();

    expect(component.formError).toBe(
      'No user identifier. Please log in again.'
    );
    expect(projectServiceSpy.createProject).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
    expect(hostComponent.saved).toBeFalse();
  }));

  // Test cancel button click.
  it('should emit cancel when cancel button is clicked', () => {
    // --- KLUCZOWA ZMIANA TUTAJ ---
    // Bezpośrednie wywołanie emitera output
    component.cancel.emit();
    expect(hostComponent.cancelled).toBeTrue();
  });
});
