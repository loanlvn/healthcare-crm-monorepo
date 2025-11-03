export type Order = 'asc' | 'desc';

export type PaginatiionQuery = {
    page?: number | string;
    pageSize?: number | string;
    limit?: number | string;
    offset?: number | string;
    // Cursors based pagination
    cursor?: string;
    take?: number | string;
    // Faire le tri
    orderBy?: string;
    order?: Order;
};

export type NormalizePagination = {
    mode: 'offset' | 'cursor';
    page: number;
    pageSize: number;
    skip?: number;
    // Pour le cursor based pagination
    cursor?: string | null | undefined;
    take?: number;
    //tri
    orderBy?: string;
    order?: Order;
    // limites
    maxPageSize: number;
};

export type PageMeta = {
    mode: 'offset' | 'cursor';
    total?: number;
    page?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    nextCursor?: string | null;
    previousCursor?: string | null;
    orderBy?: string;
    order?: Order;
}

export type PageResponse<T> = {
    items: T[];
    meta: PageMeta;
};

function clampInt(n: any, min: number, max: number) {
  const x = Number(n);
  if (Number.isNaN(x) || !Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, Math.trunc(x)));
}

/** Normalisation de la pagination depuis le req.query */
export function parsePagination(q: PaginatiionQuery, opts?: {defaultPageSize?: number; maxPageSize?: number; defaultOrder?: Order}
): NormalizePagination {
    const defaultPageSize = Math.max(1, Math.min(100, (opts?.defaultPageSize ?? 20)));
    const maxPageSize = Math.max(defaultPageSize, (opts?.maxPageSize ?? 100));
    const order: Order = (q.order === 'asc' ? 'asc' : (q.order === 'desc' ? 'desc' : (opts?.defaultOrder ?? 'desc')));
    const rawPageSize = Number(q.pageSize ?? q.limit ?? defaultPageSize);
    const pageSize = clampInt(rawPageSize, 1, maxPageSize);

    // Si le curseur est présent, on est en cursor-based pagination
    if (q.cursor !== undefined && q.cursor !== null && q.cursor !== '') {
        const takeNum = q.take !== undefined ? Number(q.take) : pageSize;
        const take = clampInt(takeNum, 1, maxPageSize);
        return {
            mode: 'cursor',
            page: 1,
            pageSize,
            skip: 0,
            cursor: String(q.cursor),
            take,
            orderBy: q.orderBy,
            order,
            maxPageSize
        };
    }

    const page = Math.max(1, Number(q.page ?? 1));
    const skip = q.offset !== undefined ? Math.max(0, Number(q.offset)) : (page - 1) * pageSize;
    
    return {
        mode: 'offset',
        page,
        pageSize,
        skip,
        cursor: null,
        take: pageSize,
        orderBy: q.orderBy || 'createdAt',
        order,
        maxPageSize
    };
};

/** Construction des args Prisma pour findMany en mode OFFSET */
export function toPrismaOffsetArgs(pg: NormalizePagination) {
    if (pg.mode !== 'offset') throw new Error('toPrismaOffsetArgs: pagination mode must be offset');
    return {
        skip: pg.skip,
        take: pg.pageSize,
        orderBy: pg.orderBy ? { [pg.orderBy]: pg.order } : undefined
    } as const;
};

/** Construction des args Prisma pour findMany en mode CURSOR 
 * @param pg NormalizedPagination (mode cursor)
 * @param uniqueKey nom de la colonne unique servant de curseur (ex: id, createdAt...)
 * @param cursorValue valeur du curseur (s'il faut la convertir, sinon la valeur dans pg.cursor est utilisée) (ex: id, createdAt...)
*/

export function toPrismaCursorArgs<TCursor = string, TWhereUnique = any>(
    pg: NormalizePagination,
    getWhereUnique: (value: TCursor) => TWhereUnique,
    cursorValue?: TCursor
) {
    if (pg.mode !== 'cursor') throw new Error('toPrismaCursorArgs: pagination mode must be cursor');
    const value = (cursorValue ?? (pg.cursor as any)) as TCursor;
    return {
        cursor: getWhereUnique(value),
        skip: 1, // always skip the cursor itself
        take: pg.take ?? pg.pageSize,
        orderBy: pg.orderBy ? { [pg.orderBy]: pg.order } : undefined
    } as const;
};

/**
 * Fabrique la réponse standard avec meta en OFFSET
 * @param items éléments retournés par findMany
 * @param total total d’éléments
 * @param pg pagination normalisée
*/

export function makeOffsetPage<T>(items: T[], total: number, pg: NormalizePagination): PageResponse<T> {
    if (pg.mode !== 'offset') throw new Error('makeOffsetPage: pagination mode must be offset');
    const totalPages = Math.max(1, Math.ceil(total / pg.pageSize));
    const hasNextPage = pg.page < totalPages;
    const hasPreviousPage = pg.page > 1;
    return {
        items,
        meta: {
            mode: 'offset',
            total,
            page: pg.page,
            pageSize: pg.pageSize,
            hasNextPage,
            hasPreviousPage,
            orderBy: pg.orderBy,
            order: pg.order
        }
    }
};

/** Fabrique la réponse standard avec meta en CURSOR
 * @param items éléments retournés par findMany
 * @param getCursor fonction pour obtenir la valeur du curseur à partir du champ unique (ex: item => item.id)
 * @param pg pagination normalisée
 */

export function makeCursorPage<T, TCursor = string>(
    items: T[],
    getCursor: (item: T) => TCursor,
    pg: NormalizePagination
): PageResponse<T> {
    if (pg.mode !== 'cursor') throw new Error('makeCursorPage: pagination mode must be cursor');
    const hasPreviousPage = Boolean(pg.cursor) && (pg. take ?? 0) < 0; // si on a un curseur et qu’on va en arrière
    const hasNextPage = items.length === Math.abs(pg.take ?? pg.pageSize)
    let nextCursor: TCursor | null = null;
    let previousCursor: TCursor | null = null;
    if (items.length > 0) {
        if((pg.take ?? 0) > 0) {
            nextCursor = getCursor(items[items.length - 1]);
            previousCursor = getCursor(items[0]);
        } else if ((pg.take ?? 0) < 0) {
            nextCursor = getCursor(items[0]);
            previousCursor = getCursor(items[items.length - 1]);
        }
    }
    return {
        items,
        meta: {
            mode: 'cursor',
            hasNextPage,
            hasPreviousPage,
            nextCursor: (nextCursor as any) ?? null,
            previousCursor: (previousCursor as any) ?? null,
            orderBy: pg.orderBy,
            order: pg.order
        }
    };
}
