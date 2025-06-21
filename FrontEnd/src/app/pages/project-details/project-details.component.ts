import { Component, OnInit, inject, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { TaskService } from '../../services/task.service';
import { NgIf /*ToDo NgFor, DatePipe  */ } from '@angular/common';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { Project } from '../../models/project.model'; // NEW: Import Project model
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-project-details',
  standalone: true,
  imports: [NgIf, TaskListComponent /*ToDo NgFor, DatePipe */],
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss'],
})
export class ProjectDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  taskService = inject(TaskService); // Public to use in template
  router = inject(Router);

  // Fix: Ensure the projectId signal is typed correctly
  projectId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id')!))
  );

  // Fix: Ensure currentProject computed signal returns Project | undefined
  currentProject = computed<Project | undefined>(() => {
    const projectId = this.projectId();
    if (!projectId) return undefined;
    return this.projectService
      .projects()
      .find((p: Project) => p.id === projectId); // Fix: Type 'p' as Project
  });

  totalTasks = computed(() => this.taskService.tasks().length);
  completedTasks = computed(
    () =>
      this.taskService.tasks().filter((task) => task.status === 'done').length
  );
  completionPercentage = computed(() => {
    const total = this.totalTasks();
    const completed = this.completedTasks();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });

  constructor() {
    effect(
      () => {
        const projectId = this.projectId();
        if (projectId) {
          // Load tasks when projectId changes
          this.taskService.loadTasksForProject(projectId).subscribe();
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    // If projects are not yet loaded (e.g., after direct URL access), load them.
    if (this.projectService.projects().length === 0) {
      const currentUserId = localStorage.getItem('current_user_id');
      if (currentUserId) {
        this.projectService.loadProjects(currentUserId).subscribe();
      }
    }
  }

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
}
