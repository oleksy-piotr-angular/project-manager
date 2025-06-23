import {
  Component,
  input,
  output,
  OnInit,
  inject,
  computed,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { InputFieldComponent } from '../../shared/custom-controls/input-field/input-field.component';
import { ErrorMessageComponent } from '../../shared/error-message/error-message.component';
import { NgIf } from '@angular/common';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { Project } from '../../models/project.model';
import { CreateProjectDto, UpdateProjectDto } from '../../dtos/project.dto';

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
export class ProjectFormComponent implements OnInit {
  project = input<Project | undefined>();
  isEditing = computed(() => !!this.project());

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
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.isEditing()) {
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
    if (this.projectForm.valid) {
      this.isLoading = true;
      const currentUserId = this.authService.currentUser()?.id;

      if (!currentUserId) {
        this.formError = 'No user identifier. Please log in again.';
        this.isLoading = false;
        return;
      }

      if (this.isEditing()) {
        const projectId = (this.project() as Project).id;
        const updateDto: UpdateProjectDto = this.projectForm.value;
        this.projectService.updateProject(projectId, updateDto).subscribe({
          next: () => {
            this.isLoading = false;
            this.save.emit();
            alert('Project updated successfully!');
          },
          error: (err) => {
            this.isLoading = false;
            this.formError = `Update error: ${err.message || 'Unknown error'}`;
          },
        });
      } else {
        const createDto: CreateProjectDto = {
          ...this.projectForm.value,
          userId: currentUserId,
        };
        this.projectService.createProject(createDto).subscribe({
          next: () => {
            this.isLoading = false;
            this.projectForm.reset();
            this.save.emit();
            alert('Project added successfully!');
          },
          error: (err) => {
            this.isLoading = false;
            this.formError = `Add error: ${err.message || 'Unknown error'}`;
          },
        });
      }
    }
  }
}
