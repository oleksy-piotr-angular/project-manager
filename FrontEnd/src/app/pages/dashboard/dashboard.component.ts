import { Component, inject, effect, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
//ToDo import { ProjectFormComponent } from '../../components/project-form/project-form.component';
import { Project } from '../../models/project.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, ProjectListComponent /*, ProjectFormComponent */],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);

  showProjectForm = signal(false);
  editingProject = signal<Project | undefined>(undefined);

  constructor() {
    effect(
      () => {
        if (
          this.authService.isAuthenticated() &&
          !this.authService.currentUser()
        ) {
          const userId = localStorage.getItem('current_user_id');
          if (userId) {
            this.authService.fetchCurrentUser(userId);
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openCreateProjectModal(): void {
    this.editingProject.set(undefined);
    this.showProjectForm.set(true);
  }

  onProjectFormSave(): void {
    this.showProjectForm.set(false);
  }

  onProjectFormCancel(): void {
    this.showProjectForm.set(false);
  }
}
