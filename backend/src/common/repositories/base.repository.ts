import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

/**
 * Base repository with common methods
 * T generic is the Prisma model delegate
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get Prisma model delegate
   * Override in child repositories
   */
  protected abstract get model(): any;

  /**
   * Find a record by ID
   */
  async findById(id: string, include?: any): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      ...(include && { include }),
    });
  }

  /**
   * Find many records with filter
   */
  async findMany(options?: {
    where?: any;
    include?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<T[]> {
    return this.model.findMany(options);
  }

  /**
   * Count records with filter
   */
  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Create a new record
   */
  async create(data: any, include?: any): Promise<T> {
    return this.model.create({
      data,
      ...(include && { include }),
    });
  }

  /**
   * Update a record
   */
  async update(id: string, data: any, include?: any): Promise<T> {
    return this.model.update({
      where: { id },
      data,
      ...(include && { include }),
    });
  }

  /**
   * Delete a record
   */
  async delete(id: string): Promise<T> {
    return this.model.delete({
      where: { id },
    });
  }

  /**
   * Update many records
   */
  async updateMany(where: any, data: any) {
    return this.model.updateMany({
      where,
      data,
    });
  }

  /**
   * Delete many records
   */
  async deleteMany(where: any) {
    return this.model.deleteMany({
      where,
    });
  }
}

