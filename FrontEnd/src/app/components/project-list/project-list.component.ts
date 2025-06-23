// src/app/components/project-list/project-list.component.ts

import { Component, OnInit, inject, effect } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { NgFor, NgIf } from '@angular/common'; // AsyncPipe is not needed when using toSignal
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DashboardComponent } from '../../pages/dashboard/dashboard.component'; // Ensure this path is correct

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss'],
})
export class ProjectListComponent implements OnInit {
  projectService = inject(ProjectService);
  authService = inject(AuthService);
  private router = inject(Router);
  private dashboardComponent = inject(DashboardComponent); // To handle form modal

  filterControl = new FormControl('');
  statusFilterControl = new FormControl<
    'all' | 'active' | 'completed' | 'on_hold'
  >('all');

  // Convert FormControl valueChanges Observables to Signals
  filterTextSignal = toSignal(this.filterControl.valueChanges, {
    initialValue: '',
  });
  statusFilterSignal = toSignal(this.statusFilterControl.valueChanges, {
    initialValue: 'all',
  });

  constructor() {
    // Effect to update ProjectService's filterText signal.
    // `allowSignalWrites: true` is necessary because this effect writes to another service's signal.
    effect(
      () => {
        this.projectService.filterText.set(this.filterTextSignal() || '');
      },
      { allowSignalWrites: true }
    );

    // Effect to update ProjectService's statusFilter signal.
    // `allowSignalWrites: true` is necessary because this effect writes to another service's signal.
    effect(
      () => {
        this.projectService.statusFilter.set(
          this.statusFilterSignal() || 'all'
        );
      },
      { allowSignalWrites: true }
    );

    // Effect to load or clear projects based on user authentication status.
    // This effect calls methods in ProjectService that modify its internal signals,
    // hence `allowSignalWrites: true` is required here as well.
    effect(
      () => {
        const currentUserId = this.authService.currentUser()?.id;
        if (currentUserId) {
          console.log(
            'User ID available. Loading projects for user:',
            currentUserId
          );
          this.projectService.loadProjects(currentUserId).subscribe({
            next: () =>
              console.log(
                'Projects loaded successfully for user:',
                currentUserId
              ),
            error: (err) => console.error('Error loading projects:', err),
          });
        } else {
          console.log(
            'No user ID found or user logged out. Clearing projects.'
          );
          this.projectService.clearProjects();
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // ngOnInit remains empty as all primary reactive logic is handled in the constructor effects.
    // This method can be used for other initialization logic that does not involve `effect()` calls.
  }

  /**
   * Returns the display name for a project status.
   * @param status The project status ('active', 'completed', 'on_hold').
   * @returns A human-readable string for the status.
   */
  getStatusDisplayName(status: 'active' | 'completed' | 'on_hold'): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      default:
        return status;
    }
  }

  /**
   * Opens the project creation/editing modal in the DashboardComponent.
   */
  openCreateProjectForm(): void {
    this.dashboardComponent.openCreateProjectModal();
  }

  /**
   * Navigates to the project details page for the given project ID.
   * @param projectId The ID of the project to edit.
   */
  editProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  /**
   * Deletes a project after user confirmation.
   * @param projectId The ID of the project to delete.
   */
  deleteProject(projectId: string): void {
    if (confirm('Are you sure you want to delete this project?')) {
      this.projectService.deleteProject(projectId).subscribe({
        next: () => alert('Project deleted successfully!'),
        error: (err) => alert(`Error deleting project: ${err.message}`),
      });
    }
  }
}
