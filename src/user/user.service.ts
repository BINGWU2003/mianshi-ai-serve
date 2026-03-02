import { Injectable } from '@nestjs/common';
export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class UserService {
  private readonly users: User[] = [
    {
      id: 1,
      name: 'John Doe1',
      email: 'john.doe1@example.com',
      password: 'password',
    },
    {
      id: 2,
      name: 'Jane Doe2',
      email: 'jane.doe2@example.com',
      password: 'password',
    },
    {
      id: 3,
      name: 'John Doe3',
      email: 'john.doe3@example.com',
      password: 'password',
    },
    {
      id: 4,
      name: 'Jane Doe4',
      email: 'jane.doe4@example.com',
      password: 'password',
    },
  ];

  findAll(): User[] {
    return this.users;
  }

  create(user: Omit<User, 'id'>): User {
    const newUser = {
      id: this.users.length + 1,
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }

  update(id: number, user: Omit<User, 'id'>): User | null {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return null;
    }
    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }
  delete(id: number): boolean {
    const index = this.users.findIndex((user) => user.id === id);
    if (index === -1) {
      return false;
    }
    this.users.splice(index, 1);
    return true;
  }
  findOne(id: number): User | null {
    return this.users.find((user) => user.id === id) ?? null;
  }
}
