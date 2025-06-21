import { Component, OnInit, inject, effect } from '@angular/core';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { NgFor, NgIf } from '@angular/common'; // AsyncPipe nie jest już potrzebny, jeśli używasz toSignal
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DashboardComponent } from '../../pages/dashboard/dashboard.component';

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
  private dashboardComponent = inject(DashboardComponent);

  filterControl = new FormControl('');
  statusFilterControl = new FormControl<
    'all' | 'active' | 'completed' | 'on_hold'
  >('all');

  filterTextSignal = toSignal(this.filterControl.valueChanges, {
    initialValue: '',
  });
  statusFilterSignal = toSignal(this.statusFilterControl.valueChanges, {
    initialValue: 'all',
  });

  constructor() {
    // Effects that react to changes in filter signals and update ProjectService's internal signals
    effect(() => {
      this.projectService.filterText.set(this.filterTextSignal() || '');
    });

    effect(() => {
      this.projectService.statusFilter.set(this.statusFilterSignal() || 'all');
    });

    // Effect to load projects based on user authentication status
    // This effect ensures projects are loaded when a user logs in (userId becomes available)
    // and cleared when a user logs out (userId becomes null).
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
          // *** KLUCZOWA ZMIANA: WYWOŁANIE METODY CLEARPROJECTS Z SERWISU ***
          this.projectService.clearProjects();
          // *** KONIEC ZMIANY ***
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // This method can now be empty or contain other initialization logic
    // that does not involve Angular's `effect()` function.
    // Project loading is handled reactively by the effect in the constructor.
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
