import { Component, inject, effect, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NgIf } from '@angular/common';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
import { ProjectFormComponent } from '../../components/project-form/project-form.component';
import { Project } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, ProjectListComponent, ProjectFormComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  authService = inject(AuthService);
  private router = inject(Router);
  private projectService = inject(ProjectService);

  showProjectForm = signal(false);
  editingProject = signal<Project | undefined>(undefined);

  constructor() {
    effect(
      () => {
        // This effect runs when isAuthenticated() changes.
        // The loadUserFromLocalStorage() in AuthService constructor
        // already handles loading the user if a token exists.
        // Calling fetchCurrentUser here is redundant and causes the error.
        if (
          this.authService.isAuthenticated() &&
          !this.authService.currentUser()
        ) {
          const userId = localStorage.getItem('current_user_id');
          if (userId) {
            //! If you actually need to refresh the user data from the server,
            //! and not just from localStorage, you would need to add an appropriate method
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
    // After saving, refresh the project list if we are on the dashboard.
    // If the list is in ProjectService, it will update automatically.
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.projectService.loadProjects(userId).subscribe();
    }
  }

  onProjectFormCancel(): void {
    this.showProjectForm.set(false);
  }
}
