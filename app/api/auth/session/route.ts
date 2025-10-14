import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.isAuthenticated) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      user: { id: 'admin', role: 'admin' },
      expiresAt: session.createdAt + 7 * 24 * 60 * 60 * 1000,
    });
  } catch (err: any) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
}
