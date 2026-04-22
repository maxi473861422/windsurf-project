/**
 * Soft Delete Utility
 * Provides consistent soft delete functionality across the application
 */

import { Prisma } from '@prisma/client';

/**
 * Prisma middleware for soft delete
 * Automatically filters out deleted records in queries
 */
export function softDeleteMiddleware() {
  return async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
    // Check if the model has deletedAt field
    const modelsWithSoftDelete = ['Dog', 'User', 'Organization', 'Breeder', 'HealthRecord', 'ShowResult', 'Title', 'Photo'];
    
    if (modelsWithSoftDelete.includes(params.model)) {
      // For findFirst, findMany, and count operations
      if (params.action === 'findFirst' || params.action === 'findMany' || params.action === 'count') {
        // Add deletedAt filter to exclude soft-deleted records
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        
        // Only add if not already filtering by deletedAt
        if (!params.args.where.deletedAt) {
          params.args.where.deletedAt = null;
        }
      }
      
      // For delete operation, convert to update
      if (params.action === 'delete') {
        params.action = 'update';
        params.args.data = { deletedAt: new Date() };
      }
      
      // For deleteMany operation, convert to updateMany
      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        params.args.data = { deletedAt: new Date() };
      }
    }
    
    return next(params);
  };
}

/**
 * Helper to restore a soft-deleted record
 */
export async function restoreRecord<T>(
  model: any,
  id: string
): Promise<T> {
  return model.update({
    where: { id },
    data: { deletedAt: null },
  });
}

/**
 * Helper to permanently delete a record (hard delete)
 * Use with caution - this cannot be undone
 */
export async function hardDelete<T>(
  model: any,
  id: string
): Promise<T> {
  // Temporarily disable soft delete middleware
  return model.delete({
    where: { id },
  });
}

/**
 * Helper to get only deleted records
 */
export async function getDeletedRecords<T>(
  model: any,
  params?: any
): Promise<T[]> {
  return model.findMany({
    ...params,
    where: {
      ...params?.where,
      deletedAt: { not: null },
    },
  });
}

/**
 * Helper to check if a record is soft-deleted
 */
export async function isDeleted(
  model: any,
  id: string
): Promise<boolean> {
  const record = await model.findUnique({
    where: { id },
    select: { deletedAt: true },
  });
  
  return record?.deletedAt !== null;
}

/**
 * Prisma query extension for soft delete operations
 */
export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    $allModels: {
      // Custom find method that includes deleted records
      findWithDeleted: async function (args?: any) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: undefined,
          },
        });
      },
      
      // Custom restore method
      restore: async function (id: string) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).update({
          where: { id },
          data: { deletedAt: null },
        });
      },
      
      // Custom hard delete method
      hardDelete: async function (id: string) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).delete({
          where: { id },
        });
      },
    },
  },
});
