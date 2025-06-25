export interface CreateProjectDto {
  name: string;
  description: string;
  userId: string;
  status: 'active' | 'completed' | 'on_hold';
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
}
