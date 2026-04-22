/**
 * Sistema de paginación eficiente para producción
 * Soporta offset-based y cursor-based pagination
 */

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

export interface CursorInfo {
  id: string;
  createdAt: string;
}

/**
 * Codificar cursor para cursor-based pagination
 */
export function encodeCursor(cursor: CursorInfo): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64');
}

/**
 * Decodificar cursor para cursor-based pagination
 */
export function decodeCursor(cursor: string): CursorInfo {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch (error) {
    throw new Error('Invalid cursor');
  }
}

/**
 * Paginación offset-based (tradicional)
 */
export class OffsetPagination {
  static async paginate<T>(
    query: any,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      limit = 20,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Validar límite
    const validLimit = Math.min(Math.max(limit, 1), 100);
    const validOffset = Math.max(offset, 0);

    // Obtener total
    const total = await query.count();

    // Aplicar ordenamiento y paginación
    const data = await query
      .orderBy(sortBy, sortOrder)
      .skip(validOffset)
      .take(validLimit);

    const hasMore = validOffset + validLimit < total;

    return {
      data,
      pagination: {
        total,
        limit: validLimit,
        offset: validOffset,
        hasMore,
      },
    };
  }
}

/**
 * Paginación cursor-based (más eficiente para grandes datasets)
 */
export class CursorPagination {
  static async paginate<T>(
    query: any,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const {
      limit = 20,
      cursor,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Validar límite
    const validLimit = Math.min(Math.max(limit, 1), 100);

    // Aplicar cursor si existe
    if (cursor) {
      try {
        const cursorInfo = decodeCursor(cursor);
        
        if (sortOrder === 'desc') {
          query = query.where({
            OR: [
              { [sortBy]: { lt: cursorInfo.createdAt } },
              { 
                [sortBy]: cursorInfo.createdAt,
                id: { lt: cursorInfo.id },
              },
            ],
          });
        } else {
          query = query.where({
            OR: [
              { [sortBy]: { gt: cursorInfo.createdAt } },
              { 
                [sortBy]: cursorInfo.createdAt,
                id: { gt: cursorInfo.id },
              },
            ],
          });
        }
      } catch (error) {
        // Si el cursor es inválido, ignorarlo
        console.error('Invalid cursor, ignoring:', error);
      }
    }

    // Aplicar ordenamiento y límite
    const data = await query
      .orderBy(sortBy, sortOrder)
      .orderBy('id', sortOrder)
      .take(validLimit + 1); // Obtener uno extra para verificar si hay más

    // Determinar si hay más resultados
    const hasMore = data.length > validLimit;
    const paginatedData = hasMore ? data.slice(0, -1) : data;

    // Generar siguiente cursor
    let nextCursor: string | undefined;
    if (hasMore && paginatedData.length > 0) {
      const lastItem = paginatedData[paginatedData.length - 1] as any;
      nextCursor = encodeCursor({
        id: lastItem.id,
        createdAt: lastItem.createdAt?.toISOString() || lastItem[sortBy]?.toISOString(),
      });
    }

    return {
      data: paginatedData,
      pagination: {
        total: -1, // No disponible en cursor-based pagination
        limit: validLimit,
        offset: -1,
        hasMore,
        nextCursor,
      },
    };
  }
}

/**
 * Paginación híbrida (combina lo mejor de ambos mundos)
 */
export class HybridPagination {
  static async paginate<T>(
    query: any,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { cursor } = options;

    // Usar cursor-based si se proporciona cursor
    if (cursor) {
      return CursorPagination.paginate(query, options);
    }

    // Usar offset-based para primera página
    return OffsetPagination.paginate(query, options);
  }
}

/**
 * Generador de metadatos de paginación para respuesta
 */
export function generatePaginationMetadata(
  result: PaginatedResult<any>,
  baseUrl: string,
  queryParams: Record<string, any> = {}
): any {
  const { total, limit, offset, hasMore, nextCursor, prevCursor } = result.pagination;

  const metadata: any = {
    total,
    limit,
    offset,
    hasMore,
  };

  // Links para navegación
  const links: Record<string, string> = {};
  const params = new URLSearchParams(queryParams);

  // Self
  params.set('limit', limit.toString());
  if (offset >= 0) params.set('offset', offset.toString());
  links.self = `${baseUrl}?${params.toString()}`;

  // First
  params.set('offset', '0');
  links.first = `${baseUrl}?${params.toString()}`;

  // Last
  if (total > 0) {
    const lastOffset = Math.floor((total - 1) / limit) * limit;
    params.set('offset', lastOffset.toString());
    links.last = `${baseUrl}?${params.toString()}`;
  }

  // Next
  if (hasMore) {
    if (nextCursor) {
      params.set('cursor', nextCursor);
      params.delete('offset');
      links.next = `${baseUrl}?${params.toString()}`;
    } else {
      params.set('offset', (offset + limit).toString());
      links.next = `${baseUrl}?${params.toString()}`;
    }
  }

  // Previous
  if (prevCursor) {
    params.set('cursor', prevCursor);
    params.delete('offset');
    links.prev = `${baseUrl}?${params.toString()}`;
  } else if (offset > 0) {
    const prevOffset = Math.max(0, offset - limit);
    params.set('offset', prevOffset.toString());
    params.delete('cursor');
    links.prev = `${baseUrl}?${params.toString()}`;
  }

  metadata.links = links;

  return metadata;
}

/**
 * Validar opciones de paginación
 */
export function validatePaginationOptions(options: PaginationOptions): PaginationOptions {
  const { limit, offset, cursor, sortBy, sortOrder } = options;

  const validOptions: PaginationOptions = {};

  if (limit !== undefined) {
    validOptions.limit = Math.min(Math.max(limit, 1), 100);
  }

  if (offset !== undefined) {
    validOptions.offset = Math.max(offset, 0);
  }

  if (cursor) {
    validOptions.cursor = cursor;
  }

  if (sortBy) {
    // Validar que sortBy sea un campo seguro (whitelist)
    const allowedFields = [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      'birthDate',
      'registrationNumber',
      'coi5Gen',
      'coi10Gen',
    ];
    
    if (allowedFields.includes(sortBy)) {
      validOptions.sortBy = sortBy;
    }
  }

  if (sortOrder === 'asc' || sortOrder === 'desc') {
    validOptions.sortOrder = sortOrder;
  }

  return validOptions;
}
