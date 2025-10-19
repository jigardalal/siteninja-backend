import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/utils/apiResponse';

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    return successResponse({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }, 'API is running');
  } catch (error: any) {
    return errorResponse(
      'Health check failed: ' + error.message,
      503
    );
  }
}
