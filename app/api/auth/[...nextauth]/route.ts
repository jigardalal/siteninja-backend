import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

/**
 * NextAuth.js Configuration
 *
 * Provides JWT-based authentication with credentials provider
 * Supports email/password login with role-based access control
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Missing email or password');
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true },
        });

        if (!user || !user.passwordHash) {
          // Generic error message to prevent email enumeration
          throw new Error('Invalid credentials');
        }

        // Verify password
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Check if user account is active
        if (user.status !== 'active') {
          throw new Error('Account is not active. Please contact support.');
        }

        // Update last login timestamp (async, don't await)
        prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        }).catch((err) => {
          console.error('Failed to update last login:', err);
        });

        // Return user object for JWT
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  callbacks: {
    /**
     * JWT Callback
     *
     * Adds user role and tenantId to the JWT token
     * This allows us to access these values in the session callback
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },

    /**
     * Session Callback
     *
     * Makes user data available on the client side
     * Includes role and tenantId for authorization checks
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string | null;
        session.user.firstName = token.firstName as string | null;
        session.user.lastName = token.lastName as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
    signOut: '/logout',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
