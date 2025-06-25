/**
 * Defines the possible statuses for a project.
 */
export enum ProjectStatus {
  Active = 'active',
  OnHold = 'on_hold',
  Completed = 'completed',
}

/**
 * Represents a project entity.
 */
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus; // Using the ProjectStatus enum for type safety and consistency
}
