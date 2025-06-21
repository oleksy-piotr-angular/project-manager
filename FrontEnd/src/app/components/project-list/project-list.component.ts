import { Component, OnInit, inject, effect } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop'; // Import toSignal
import { Router } from '@angular/router';
import { DashboardComponent } from '../../pages/dashboard/dashboard.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [NgFor, NgIf, /*ToDO AsyncPipe, */ ReactiveFormsModule],
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

  // --- FIX START ---
  // Use toSignal to convert Observable from valueChanges to a Signal
  // The `initialValue` for `toSignal` is important to match the initial state.
  // For `filterControl`, it's an empty string.
  // For `statusFilterControl`, it's 'all'.
  filterTextSignal = toSignal(this.filterControl.valueChanges, {
    initialValue: '',
  });
  statusFilterSignal = toSignal(this.statusFilterControl.valueChanges, {
    initialValue: 'all',
  });
  // --- FIX END ---

  ngOnInit(): void {
    const currentUserId = this.authService.currentUser()?.id;
    if (currentUserId) {
      this.projectService.loadProjects(currentUserId).subscribe();
    }

    // --- FIX START ---
    // Instead of subscribing and manually setting the signal, use effect
    // to react to changes in the new `filterTextSignal` and `statusFilterSignal`.
    // This ensures the service's signals are updated reactively.
    effect(() => {
      this.projectService.filterText.set(this.filterTextSignal() || '');
    });

    effect(() => {
      this.projectService.statusFilter.set(this.statusFilterSignal() || 'all');
    });
    // --- FIX END ---
  }

  getStatusDisplayName(status: 'active' | 'completed' | 'on_hold'): string {
    switch (status) {
      case 'active':
        return 'Aktywny';
      case 'completed':
        return 'Ukończony';
      case 'on_hold':
        return 'Wstrzymany';
      default:
        return status;
    }
  }

  openCreateProjectForm(): void {
    this.dashboardComponent.openCreateProjectModal();
  }

  editProject(projectId: string): void {
    this.router.navigate(['/projects', projectId]);
  }

  deleteProject(projectId: string): void {
    if (confirm('Czy na pewno chcesz usunąć ten projekt?')) {
      this.projectService.deleteProject(projectId).subscribe({
        next: () => alert('Projekt usunięty pomyślnie!'),
        error: (err) => alert(`Błąd podczas usuwania projektu: ${err.message}`),
      });
    }
  }
}
