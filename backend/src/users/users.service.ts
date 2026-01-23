import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../common/repositories/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserPublic } from '../common/types/user.types';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserPublic> {
    // Check if email already exists
    const existingEmail = await this.usersRepository.findByEmail(createUserDto.email);
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check if username already exists
    const existingUsername = await this.usersRepository.findByUsername(createUserDto.username);
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Create user
    const user = await this.usersRepository.createUser({
      ...createUserDto,
      password: hashedPassword,
    });

    // Return user without password
    const { password, ...userPublic } = user;
    return userPublic;
  }

  async findAll(): Promise<UserPublic[]> {
    const users = await this.usersRepository.findMany({
      where: { isActive: true },
    });

    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string): Promise<UserPublic> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...userPublic } = user;
    return userPublic;
  }

  async findByEmail(email: string) {
    return this.usersRepository.findByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserPublic> {
    await this.findOne(id);

    // Check email conflict (if changed)
    if (updateUserDto.email) {
      const existing = await this.usersRepository.findByEmail(updateUserDto.email);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check username conflict (if changed)
    if (updateUserDto.username) {
      const existing = await this.usersRepository.findByUsername(updateUserDto.username);
      if (existing && existing.id !== id) {
        throw new ConflictException('Username already exists');
      }
    }

    const user = await this.usersRepository.updateUser(id, updateUserDto);
    const { password, ...userPublic } = user;
    return userPublic;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.usersRepository.delete(id);
  }

  async validateUser(emailOrUsername: string, password: string) {
    const user = await this.usersRepository.findByEmailOrUsername(emailOrUsername);

    if (!user || !user.isActive) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    const { password: _, ...userPublic } = user;
    return userPublic;
  }
}

