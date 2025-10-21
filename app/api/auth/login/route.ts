import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

/**
 * Custom Login Endpoint
 *
 * Returns a JWT token directly for API testing
 * Separate from NextAuth for Postman/API client usage
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.passwordHash) {
      // Generic error message to prevent email enumeration
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is not active. Please contact support.' },
        { status: 403 }
      );
    }

    // Update last login timestamp (async, don't await)
    prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch((err) => {
      console.error('Failed to update last login:', err);
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      process.env.NEXTAUTH_SECRET || 'fallback-secret',
      { expiresIn: '30d' }
    );

    // Return token and user data
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenant: user.tenant ? {
            id: user.tenant.id,
            name: user.tenant.name,
            businessName: user.tenant.businessName,
            subdomain: user.tenant.subdomain,
          } : null,
        },
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
