import 'next-auth';
import 'next-auth/jwt';

/**
 * TypeScript Module Augmentation for NextAuth
 *
 * Extends the default NextAuth types to include custom user properties
 * Allows TypeScript to know about our custom session fields
 */

declare module 'next-auth' {
  /**
   * Extended Session interface
   *
   * Includes custom user properties for role-based access control
   */
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string | null;
      firstName: string | null;
      lastName: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  /**
   * Extended User interface
   *
   * Matches our Prisma User model
   */
  interface User {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
    firstName: string | null;
    lastName: string | null;
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extended JWT interface
   *
   * Includes custom fields stored in the JWT token
   */
  interface JWT {
    id: string;
    role: string;
    tenantId: string | null;
    firstName: string | null;
    lastName: string | null;
  }
}
