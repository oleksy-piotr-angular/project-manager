import {
  Component,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  input,
  output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Project, ProjectStatus } from '../../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../../dtos/project.dto';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { NgIf } from '@angular/common';
import { InputFieldComponent } from '../../shared/custom-controls/input-field/input-field.component';
import { ErrorMessageComponent } from '../../shared/error-message/error-message.component';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputFieldComponent,
    ErrorMessageComponent,
    NgIf,
  ],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss'],
})
export class ProjectFormComponent implements OnInit, OnChanges {
  project = input<Project | undefined>();
  isEditing = () => !!this.project();

  save = output<void>();
  cancel = output<void>();

  projectForm: FormGroup;
  isLoading = false;
  formError: string | null = null;

  private fb = inject(FormBuilder);
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  constructor() {
    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      status: [ProjectStatus.Active, Validators.required],
    });
  }

  ngOnInit(): void {
    // Do not patch the form here; handled in ngOnChanges
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && this.project()) {
      const currentProject = this.project() as Project;
      this.projectForm.patchValue({
        name: currentProject.name,
        description: currentProject.description,
        status: currentProject.status,
      });
    }
  }

  onSubmit(): void {
    this.formError = null;
    if (this.projectForm.invalid) {
      return;
    }
    this.isLoading = true;

    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) {
      this.formError = 'No user identifier. Please log in again.';
      this.isLoading = false;
      return;
    }

    if (this.isEditing()) {
      // Edit mode
      const updateDto: UpdateProjectDto = {
        name: this.projectForm.value.name,
        description: this.projectForm.value.description,
        status: this.projectForm.value.status,
      };
      this.projectService
        .updateProject(this.project()!.id, updateDto)
        .subscribe({
          next: () => {
            alert('Project updated successfully!');
            this.save.emit();
            this.isLoading = false;
          },
          error: (err) => {
            this.formError = `Update error: ${err.message || err}`;
            this.isLoading = false;
          },
        });
    } else {
      // Create mode
      const createDto: CreateProjectDto = {
        name: this.projectForm.value.name,
        description: this.projectForm.value.description,
        status: this.projectForm.value.status,
        userId: currentUserId,
      };
      this.projectService.createProject(createDto).subscribe({
        next: () => {
          alert('Project added successfully!');
          this.save.emit();
          this.projectForm.reset({
            name: null,
            description: null,
            status: ProjectStatus.Active,
          });
          this.isLoading = false;
        },
        error: (err) => {
          this.formError = `Add error: ${err.message || err}`;
          this.isLoading = false;
        },
      });
    }
  }
}
