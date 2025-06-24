// DTO for creating a new task
export interface CreateTaskDto {
  projectId: string; // The project ID the task belongs to
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done'; // Revised status values
  dueDate?: string;
}

// DTO for updating an existing task (all fields are optional as it's a partial update)
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done'; // Revised status values
  dueDate?: string;
}
