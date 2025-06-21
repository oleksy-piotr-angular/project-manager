import { User } from '../models/user.model';

export class UserMapper {
  static fromDto(data: any): User {
    return {
      id: data.id,
      email: data.email,
      name: data.name,
    };
  }
}
