import { Task } from '../models/task.model';
import { CreateTaskDto, UpdateTaskDto } from '../dtos/task.dto';

export class TaskMapper {
  // Converts a DTO (from API) to a Task model
  static fromDto(dto: any): Task {
    return {
      id: dto.id,
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description,
      status: dto.status,
      dueDate: dto.dueDate,
    };
  }

  // Converts a Task model to a CreateTaskDto
  static toCreateDto(model: Partial<Task>): CreateTaskDto {
    return {
      projectId: model.projectId!, // Assuming projectId will always be present when creating
      title: model.title!,
      description: model.description!,
      status: model.status || 'todo', // Default status if not provided, revised to 'todo'
      dueDate: model.dueDate,
    };
  }

  // Converts a Task model to an UpdateTaskDto
  static toUpdateDto(model: Partial<Task>): UpdateTaskDto {
    return {
      title: model.title,
      description: model.description,
      status: model.status,
      dueDate: model.dueDate,
    };
  }
}
