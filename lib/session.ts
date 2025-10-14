import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { env } from './env';

export interface SessionData {
  isAuthenticated: boolean;
  user?: { id: string; role: string };
  createdAt: number;
  expiresAt?: number;
}

const sessionOptions: SessionOptions = {
  password: env.SESSION_PASSWORD,
  cookieName: 'smartsuite_session',
  cookieOptions: {
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  },
};

/**
 * Get the current session
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<IronSession<SessionData>> {
  const session = await getSession();

  if (!session.isAuthenticated) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Create a new authenticated session
 */
export async function createSession(password: string): Promise<boolean> {
  // Verify password
  const isValid = await bcrypt.compare(password, env.DASHBOARD_PASSWORD_HASH);

  if (!isValid) {
    return false;
  }

  // Create session
  const session = await getSession();
  session.isAuthenticated = true;
  session.user = { id: 'admin', role: 'admin' };
  session.createdAt = Date.now();
  session.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  await session.save();

  return true;
}

/**
 * Destroy the current session
 */
export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}
