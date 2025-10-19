export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  return { page, limit, sort, order };
}

export function calculateSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function buildPrismaOrderBy(sort: string, order: 'asc' | 'desc') {
  return { [sort]: order };
}
