import { Project } from '../models/project.model';
import { CreateProjectDto } from '../dtos/project.dto';

export class ProjectMapper {
  static fromDto(data: any): Project {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      status: data.status,
      userId: data.userId,
    };
  }

  static toCreateDto(project: Partial<Project>): CreateProjectDto {
    return {
      name: project.name || '',
      description: project.description || '',
      userId: project.userId || '',
    };
  }
}
