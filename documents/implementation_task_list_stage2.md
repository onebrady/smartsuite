# SmartSuite ↔ Webflow Sync - Stage 2: API Endpoints & Dashboard UI

**Project Location**: `/home/onebrady/projects/smartsuite` (root directory)
**Reference Specification**: `documents/smartsuite_webflow_sync_spec.txt`
**Estimated Timeline**: 2 weeks (Days 11-22)
**Stage Goal**: Build complete REST API and full dashboard UI for managing connections and monitoring sync

---

## Stage 2 Overview

Stage 2 builds the user interface and API layer on top of the working sync engine from Stage 1. By the end of this stage, you'll have:

✅ Complete REST API for all operations (connections, mappings, events, items)
✅ Authentication system with password-protected admin dashboard
✅ Overview dashboard with metrics and charts
✅ Connections management UI (list, detail, create, edit)
✅ 7-step mapping wizard for setting up connections
✅ Events inbox for monitoring and troubleshooting
✅ Item inspector for viewing sync history

**Prerequisites**: Stage 1 must be complete and working.

**What's NOT in Stage 2**: Testing, documentation, production deployment (those are Stage 3).

---

## Phase 8: API Endpoints - Authentication (Days 11-12)

### 8.1 Authentication API (app/api/auth/)

#### Login Endpoint (app/api/auth/login/route.ts)

- [ ] Create POST handler:
  ```typescript
  import { NextRequest } from 'next/server';
  import bcrypt from 'bcryptjs';
  import { env } from '@/lib/env';
  import { getSession } from '@/lib/session';
  import { logger } from '@/lib/logger';

  export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const { password } = body;

      if (!password) {
        return Response.json({ error: 'Password required' }, { status: 400 });
      }

      // Compare with hashed password
      const isValid = await bcrypt.compare(password, env.DASHBOARD_PASSWORD_HASH);

      if (!isValid) {
        logger.warn('Failed login attempt');
        return Response.json({ error: 'Invalid password' }, { status: 401 });
      }

      // Create session
      const session = await getSession();
      session.isAuthenticated = true;
      session.user = { id: 'admin', role: 'admin' };
      session.createdAt = Date.now();
      session.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      await session.save();

      logger.info('Admin logged in');

      return Response.json({
        success: true,
        expiresAt: session.expiresAt
      });
    } catch (err) {
      logger.error({ err }, 'Login error');
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  }
  ```
- [ ] Test login with correct password (should succeed)
- [ ] Test login with incorrect password (should fail)

#### Logout Endpoint (app/api/auth/logout/route.ts)

- [ ] Create POST handler:
  ```typescript
  import { getSession } from '@/lib/session';

  export async function POST() {
    const session = await getSession();
    session.destroy();

    return Response.json({ success: true });
  }
  ```
- [ ] Test logout clears session

#### Session Check Endpoint (app/api/auth/session/route.ts)

- [ ] Create GET handler:
  ```typescript
  import { getSession } from '@/lib/session';

  export async function GET() {
    const session = await getSession();

    if (!session.isAuthenticated) {
      return Response.json({ authenticated: false }, { status: 401 });
    }

    return Response.json({
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt
    });
  }
  ```
- [ ] Test returns authenticated status

**Reference**: Section 12.1 (Authentication API)

### 8.2 Authentication Middleware

- [ ] Create `middleware.ts` in root:
  ```typescript
  import { NextResponse } from 'next/server';
  import type { NextRequest } from 'next/server';
  import { getSession } from './lib/session';

  export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes
    const publicRoutes = [
      '/api/hooks',
      '/api/health',
      '/api/auth/login'
    ];

    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Protected routes
    if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
      const session = await getSession();

      if (!session.isAuthenticated) {
        if (pathname.startsWith('/admin')) {
          // Redirect to login
          return NextResponse.redirect(new URL('/admin/login', request.url));
        } else {
          // API: return 401
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ['/admin/:path*', '/api/:path*']
  };
  ```
- [ ] Test protected routes require authentication
- [ ] Test public routes work without auth

**Reference**: Section 7.3 (Dashboard Authentication)

---

## Phase 9: API Endpoints - Connections & Mappings (Days 12-14)

### 9.1 Connections API (app/api/connections/)

#### List Connections (app/api/connections/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  import { NextRequest } from 'next/server';
  import { prisma } from '@/lib/db';
  import { requireAuth } from '@/lib/session';

  export async function GET(request: NextRequest) {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [connections, total] = await Promise.all([
      prisma.connection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          sourceType: true,
          targetType: true,
          lastSuccessAt: true,
          lastErrorAt: true,
          consecutiveErrors: true,
          createdAt: true,
          updatedAt: true,
          // Don't include encrypted credentials
        }
      }),
      prisma.connection.count({ where })
    ]);

    return Response.json({
      connections,
      total,
      limit,
      offset
    });
  }
  ```
- [ ] Test with various filters
- [ ] Test pagination

#### Get Single Connection (app/api/connections/[id]/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  import { requireAuth } from '@/lib/session';
  import { prisma } from '@/lib/db';

  export async function GET(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    await requireAuth();

    const connection = await prisma.connection.findUnique({
      where: { id: params.id },
      include: { mappings: true },
      // Omit encrypted credentials in response
    });

    if (!connection) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    return Response.json(connection);
  }
  ```
- [ ] Test returns connection details

#### Create Connection (app/api/connections/route.ts - POST)

- [ ] Create POST handler:
  ```typescript
  import { requireAuth } from '@/lib/session';
  import { prisma } from '@/lib/db';
  import { encryptSecret, generateSecret } from '@/lib/crypto';
  import bcrypt from 'bcryptjs';
  import { env } from '@/lib/env';

  export async function POST(request: Request) {
    await requireAuth();

    const body = await request.json();

    // Encrypt credentials
    const ssApiKey = await encryptSecret(body.ssApiKey);
    const wfToken = await encryptSecret(body.wfToken);

    // Generate webhook secret and hash it
    const webhookSecret = generateSecret(32);
    const webhookSecretHash = await bcrypt.hash(webhookSecret, 10);

    const connection = await prisma.connection.create({
      data: {
        name: body.name,
        description: body.description,
        sourceType: body.sourceType || 'smartsuite',
        ssBaseId: body.ssBaseId,
        ssTableId: body.ssTableId,
        ssApiKeyEnc: ssApiKey.ciphertext,
        ssApiKeyIv: ssApiKey.iv,
        targetType: body.targetType || 'webflow',
        wfSiteId: body.wfSiteId,
        wfCollectionId: body.wfCollectionId,
        wfTokenEnc: wfToken.ciphertext,
        wfTokenIv: wfToken.iv,
        webhookSecretHash,
        webhookUrl: `${env.APP_URL}/api/hooks/${connection.id}`,
        rateLimitPerMin: body.rateLimitPerMin || 50,
        maxRetries: body.maxRetries || 5,
        retryBackoffMs: body.retryBackoffMs || 1000,
        status: 'paused', // Start paused until mapping configured
      }
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        connectionId: connection.id,
        action: 'connection.created',
        actor: 'admin',
        metadata: { connectionName: body.name }
      }
    });

    return Response.json({
      id: connection.id,
      webhookUrl: connection.webhookUrl,
      webhookSecret // Return plaintext secret ONCE
    }, { status: 201 });
  }
  ```
- [ ] Test creates connection
- [ ] Test credentials encrypted
- [ ] Test webhook URL generated

#### Update Connection (app/api/connections/[id]/route.ts - PATCH)

- [ ] Create PATCH handler:
  ```typescript
  export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    await requireAuth();

    const body = await request.json();
    const updates: any = {};

    // Handle regular fields
    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status) updates.status = body.status;
    if (body.rateLimitPerMin) updates.rateLimitPerMin = body.rateLimitPerMin;

    // Handle credential updates (re-encrypt)
    if (body.ssApiKey) {
      const encrypted = await encryptSecret(body.ssApiKey);
      updates.ssApiKeyEnc = encrypted.ciphertext;
      updates.ssApiKeyIv = encrypted.iv;
    }

    if (body.wfToken) {
      const encrypted = await encryptSecret(body.wfToken);
      updates.wfTokenEnc = encrypted.ciphertext;
      updates.wfTokenIv = encrypted.iv;
    }

    const connection = await prisma.connection.update({
      where: { id: params.id },
      data: updates
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        connectionId: params.id,
        action: 'connection.updated',
        actor: 'admin',
        metadata: { updates: Object.keys(updates) }
      }
    });

    return Response.json(connection);
  }
  ```
- [ ] Test updates connection
- [ ] Test partial updates

#### Delete Connection (app/api/connections/[id]/route.ts - DELETE)

- [ ] Create DELETE handler (soft delete):
  ```typescript
  export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    await requireAuth();

    await prisma.connection.update({
      where: { id: params.id },
      data: { status: 'archived' }
    });

    await prisma.auditLog.create({
      data: {
        connectionId: params.id,
        action: 'connection.deleted',
        actor: 'admin'
      }
    });

    return new Response(null, { status: 204 });
  }
  ```
- [ ] Test soft deletes connection

**Reference**: Section 12.2 (Connections API)

### 9.2 Mappings API (app/api/mappings/)

#### Get Mapping (app/api/mappings/[connectionId]/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  export async function GET(
    request: Request,
    { params }: { params: { connectionId: string } }
  ) {
    await requireAuth();

    const mapping = await prisma.mapping.findFirst({
      where: { connectionId: params.connectionId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!mapping) {
      return Response.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return Response.json(mapping);
  }
  ```

#### Create/Update Mapping (app/api/mappings/[connectionId]/route.ts - POST)

- [ ] Create POST handler:
  ```typescript
  export async function POST(
    request: Request,
    { params }: { params: { connectionId: string } }
  ) {
    await requireAuth();

    const body = await request.json();

    // Deactivate old mappings
    await prisma.mapping.updateMany({
      where: { connectionId: params.connectionId },
      data: { isActive: false }
    });

    // Create new mapping
    const mapping = await prisma.mapping.create({
      data: {
        connectionId: params.connectionId,
        fieldMap: body.fieldMap,
        slugTemplate: body.slugTemplate,
        statusBehavior: body.statusBehavior,
        imageFieldMap: body.imageFieldMap,
        referenceMap: body.referenceMap,
        requiredFields: body.requiredFields || [],
        isActive: true
      }
    });

    await prisma.auditLog.create({
      data: {
        connectionId: params.connectionId,
        action: 'mapping.created',
        actor: 'admin'
      }
    });

    return Response.json(mapping, { status: 201 });
  }
  ```
- [ ] Test creates mapping
- [ ] Test deactivates old mappings

**Reference**: Section 12.3 (Mappings API)

### 9.3 Discovery API (app/api/discovery/)

#### SmartSuite Discovery

- [ ] app/api/discovery/smartsuite/bases/route.ts:
  ```typescript
  import { SmartSuiteClient } from '@/lib/smartsuite';

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return Response.json({ error: 'API key required' }, { status: 400 });
    }

    const client = new SmartSuiteClient();
    const bases = await client.getBases(apiKey);

    return Response.json({ bases });
  }
  ```
- [ ] app/api/discovery/smartsuite/tables/route.ts:
  ```typescript
  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const baseId = searchParams.get('baseId');

    const client = new SmartSuiteClient();
    const tables = await client.getTables(apiKey, baseId);

    return Response.json({ tables });
  }
  ```
- [ ] app/api/discovery/smartsuite/fields/route.ts:
  ```typescript
  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey');
    const baseId = searchParams.get('baseId');
    const tableId = searchParams.get('tableId');

    const client = new SmartSuiteClient();
    const schema = await client.getSchema(apiKey, baseId, tableId);

    return Response.json({ fields: schema.structure.fields });
  }
  ```

#### Webflow Discovery

- [ ] app/api/discovery/webflow/sites/route.ts:
  ```typescript
  import { WebflowClient } from '@/lib/webflow';

  export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const client = new WebflowClient();
    const sites = await client.getSites(token);

    return Response.json({ sites });
  }
  ```
- [ ] app/api/discovery/webflow/collections/route.ts
- [ ] app/api/discovery/webflow/fields/route.ts
- [ ] Test all discovery endpoints with real credentials

**Reference**: Section 12.7 (Discovery API)

---

## Phase 10: API Endpoints - Events & Items (Days 14-15)

### 10.1 Events API (app/api/events/)

#### List Events (app/api/events/route.ts - GET)

- [ ] Create GET handler with filters:
  ```typescript
  export async function GET(request: Request) {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const status = searchParams.get('status');
    const externalId = searchParams.get('externalId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (status) where.status = status;
    if (externalId) where.externalId = { contains: externalId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          connection: {
            select: { name: true }
          }
        }
      }),
      prisma.event.count({ where })
    ]);

    return Response.json({ events, total, limit, offset });
  }
  ```
- [ ] Test with various filters

#### Get Event Detail (app/api/events/[id]/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  export async function GET(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    await requireAuth();

    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: { connection: true }
    });

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    return Response.json(event);
  }
  ```

#### Replay Event (app/api/events/[id]/replay/route.ts - POST)

- [ ] Create POST handler:
  ```typescript
  export async function POST(
    request: Request,
    { params }: { params: { id: string } }
  ) {
    await requireAuth();

    const event = await prisma.event.update({
      where: { id: params.id },
      data: {
        status: 'queued',
        attempts: 0,
        retryAfter: null,
        error: null,
        errorStack: null
      }
    });

    await prisma.auditLog.create({
      data: {
        connectionId: event.connectionId,
        action: 'event.replayed',
        actor: 'admin',
        metadata: { eventId: params.id }
      }
    });

    return Response.json(event);
  }
  ```
- [ ] Test replays event

**Reference**: Section 12.4 (Events API)

### 10.2 Items API (app/api/items/)

#### Lookup Item (app/api/items/lookup/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  export async function GET(request: Request) {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const externalId = searchParams.get('externalId');

    if (!connectionId || !externalId) {
      return Response.json({
        error: 'connectionId and externalId required'
      }, { status: 400 });
    }

    const idMap = await prisma.idMap.findUnique({
      where: {
        connectionId_externalSource_externalId: {
          connectionId,
          externalSource: 'smartsuite',
          externalId
        }
      },
      include: { connection: true }
    });

    if (!idMap) {
      return Response.json({ error: 'Item not found' }, { status: 404 });
    }

    // Fetch current Webflow data
    const wfToken = await decryptSecret({
      ciphertext: idMap.connection.wfTokenEnc,
      iv: idMap.connection.wfTokenIv
    });

    const webflowClient = new WebflowClient();
    const webflowData = await webflowClient.getItem(
      wfToken,
      idMap.connection.wfCollectionId,
      idMap.wfItemId
    );

    return Response.json({
      ...idMap,
      webflowData
    });
  }
  ```

#### Resync Item (app/api/items/resync/route.ts - POST)

- [ ] Create POST handler:
  ```typescript
  export async function POST(request: Request) {
    await requireAuth();

    const body = await request.json();
    const { connectionId, externalId } = body;

    // Fetch fresh data from SmartSuite
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    const ssApiKey = await decryptSecret({
      ciphertext: connection.ssApiKeyEnc,
      iv: connection.ssApiKeyIv
    });

    const ssClient = new SmartSuiteClient();
    const record = await ssClient.getRecord(
      ssApiKey,
      connection.ssBaseId,
      connection.ssTableId,
      externalId
    );

    // Create new event
    const event = await prisma.event.create({
      data: {
        connectionId,
        externalSource: 'smartsuite',
        externalId,
        idempotencyKey: `manual-resync-${Date.now()}`,
        payload: { event_type: 'manual_resync', data: record },
        payloadHash: crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex'),
        status: 'queued'
      }
    });

    // Process immediately (optional - or let worker handle)
    const processor = new EventProcessor();
    await processor.processEvent(event.id);

    return Response.json({
      eventId: event.id,
      status: 'queued',
      message: 'Manual resync triggered'
    });
  }
  ```
- [ ] Test resync functionality

**Reference**: Section 12.5 (Items API)

### 10.3 Analytics API (app/api/analytics/)

#### Daily Analytics (app/api/analytics/daily/route.ts - GET)

- [ ] Create GET handler:
  ```typescript
  export async function GET(request: Request) {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const where: any = {};
    if (connectionId) where.connectionId = connectionId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const analytics = await prisma.analyticsDaily.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    return Response.json({ analytics });
  }
  ```
- [ ] Test returns analytics data

**Reference**: Section 12.6 (Analytics API)

---

## Phase 11: Dashboard UI - Authentication & Layout (Days 15-16)

### 11.1 Install shadcn/ui Components

- [ ] Initialize shadcn: `npx shadcn-ui@latest init`
- [ ] Add components:
  ```bash
  npx shadcn-ui@latest add button
  npx shadcn-ui@latest add input
  npx shadcn-ui@latest add label
  npx shadcn-ui@latest add card
  npx shadcn-ui@latest add badge
  npx shadcn-ui@latest add table
  npx shadcn-ui@latest add dialog
  npx shadcn-ui@latest add select
  npx shadcn-ui@latest add tooltip
  npx shadcn-ui@latest add tabs
  npx shadcn-ui@latest add toast
  npx shadcn-ui@latest add switch
  npx shadcn-ui@latest add dropdown-menu
  ```
- [ ] Customize theme in `components/ui/`

**Reference**: Section 3.8 (UI Components)

### 11.2 Login Page (app/admin/login/page.tsx)

- [ ] Create login page:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { useRouter } from 'next/navigation';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Label } from '@/components/ui/label';
  import { Card } from '@/components/ui/card';

  export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        if (res.ok) {
          router.push('/admin');
        } else {
          const data = await res.json();
          setError(data.error || 'Login failed');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">SmartSuite ↔ Webflow</h1>
            <p className="text-gray-600">Sync Admin</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </Card>
      </div>
    );
  }
  ```
- [ ] Style with Tailwind CSS
- [ ] Test login flow

**Reference**: Section 11.1 (Authentication Page)

### 11.3 Dashboard Layout (app/admin/layout.tsx)

- [ ] Create admin layout:
  ```typescript
  import { redirect } from 'next/navigation';
  import { getSession } from '@/lib/session';
  import { DashboardNav } from '@/components/dashboard/nav';

  export default async function AdminLayout({
    children
  }: {
    children: React.ReactNode;
  }) {
    const session = await getSession();

    if (!session.isAuthenticated) {
      redirect('/admin/login');
    }

    return (
      <div className="flex min-h-screen">
        <aside className="w-64 border-r bg-gray-50">
          <DashboardNav />
        </aside>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    );
  }
  ```
- [ ] Create navigation component (components/dashboard/nav.tsx):
  ```typescript
  'use client';

  import Link from 'next/link';
  import { usePathname } from 'next/navigation';
  import { Home, Link2, List, Search, Settings, LogOut } from 'lucide-react';

  export function DashboardNav() {
    const pathname = usePathname();

    const links = [
      { href: '/admin', label: 'Overview', icon: Home },
      { href: '/admin/connections', label: 'Connections', icon: Link2 },
      { href: '/admin/events', label: 'Events', icon: List },
      { href: '/admin/items', label: 'Items', icon: Search },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ];

    return (
      <nav className="p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold">Sync Admin</h2>
        </div>

        <ul className="space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                  pathname === href
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/admin/login';
            }}
            className="flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </nav>
    );
  }
  ```
- [ ] Test navigation works
- [ ] Make responsive

**Reference**: Section 11.4 (Dashboard Layout)

---

## Phase 12: Dashboard UI - Overview & Connections (Days 16-18)

### 12.1 Overview Dashboard (app/admin/page.tsx)

- [ ] Create overview page with metrics and charts:
  ```typescript
  import { Card } from '@/components/ui/card';
  import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { EventsChart } from '@/components/dashboard/events-chart';
  import { MetricsCards } from '@/components/dashboard/metrics-cards';
  import { ConnectionsList } from '@/components/dashboard/connections-list';
  import { RecentErrors } from '@/components/dashboard/recent-errors';

  export default async function DashboardPage() {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Overview</h1>

        <Tabs defaultValue="24h">
          <TabsList>
            <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
          </TabsList>
        </Tabs>

        <MetricsCards timeRange="24h" />

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Event Volume</h2>
          <EventsChart timeRange="7d" />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Active Connections</h2>
          <ConnectionsList />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Recent Errors</h2>
          <RecentErrors />
        </Card>
      </div>
    );
  }
  ```
- [ ] Create MetricsCards component with stat cards
- [ ] Create EventsChart using Recharts
- [ ] Create ConnectionsList table
- [ ] Create RecentErrors list
- [ ] Fetch data from API
- [ ] Add loading states

**Reference**: Section 11.2 (Overview Dashboard)

### 12.2 Connections List (app/admin/connections/page.tsx)

- [ ] Create connections list page:
  ```typescript
  'use client';

  import { useState, useEffect } from 'react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
  import { Select } from '@/components/ui/select';
  import { Badge } from '@/components/ui/badge';
  import { DataTable } from '@/components/ui/data-table';
  import { Plus } from 'lucide-react';
  import Link from 'next/link';

  export default function ConnectionsPage() {
    const [connections, setConnections] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
      fetchConnections();
    }, [search, statusFilter]);

    const fetchConnections = async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/connections?${params}`);
      const data = await res.json();
      setConnections(data.connections);
    };

    const columns = [
      {
        accessorKey: 'name',
        header: 'Name',
      },
      {
        accessorKey: 'sourceType',
        header: 'Source',
      },
      {
        accessorKey: 'targetType',
        header: 'Target',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        accessorKey: 'lastSuccessAt',
        header: 'Last Success',
        cell: ({ row }) => formatRelativeTime(row.original.lastSuccessAt)
      },
      {
        id: 'actions',
        cell: ({ row }) => <ConnectionActions connection={row.original} />
      }
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Connections</h1>
          <Link href="/admin/connections/new">
            <Button>
              <Plus className="mr-2" size={16} />
              New Connection
            </Button>
          </Link>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </Select>
        </div>

        <DataTable columns={columns} data={connections} />
      </div>
    );
  }
  ```
- [ ] Create StatusBadge component
- [ ] Create ConnectionActions dropdown
- [ ] Implement search and filter
- [ ] Add pagination
- [ ] Test all actions

**Reference**: Section 11.3 (Connections List)

### 12.3 Connection Detail (app/admin/connections/[id]/page.tsx)

- [ ] Create connection detail page:
  ```typescript
  import { Card } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { prisma } from '@/lib/db';
  import { WebhookConfig } from '@/components/connections/webhook-config';
  import { FieldMappingTable } from '@/components/connections/field-mapping-table';
  import { RecentEvents } from '@/components/connections/recent-events';
  import { PerformanceCharts } from '@/components/connections/performance-charts';

  export default async function ConnectionDetailPage({
    params
  }: {
    params: { id: string }
  }) {
    const connection = await prisma.connection.findUnique({
      where: { id: params.id },
      include: { mappings: true }
    });

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{connection.name}</h1>
            <Badge>{connection.status}</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit</Button>
            <Button variant="outline">
              {connection.status === 'active' ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
          {/* Show source/target details */}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Webhook Configuration</h2>
          <WebhookConfig connection={connection} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Field Mapping</h2>
          <FieldMappingTable mapping={connection.mappings[0]} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Recent Events</h2>
          <RecentEvents connectionId={connection.id} />
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Performance</h2>
          <PerformanceCharts connectionId={connection.id} />
        </Card>
      </div>
    );
  }
  ```
- [ ] Create all sub-components
- [ ] Add test webhook modal
- [ ] Implement pause/resume
- [ ] Test all sections

**Reference**: Section 11.4 (Connection Detail Page)

---

## Phase 13: Mapping Wizard (Days 18-20)

This is the most complex UI component. Break it down into manageable steps.

### 13.1 Wizard Container (app/admin/connections/new/page.tsx)

- [ ] Create multi-step form container:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { WizardStep1 } from '@/components/wizard/step1-credentials';
  import { WizardStep2 } from '@/components/wizard/step2-source';
  import { WizardStep3 } from '@/components/wizard/step3-target';
  import { WizardStep4 } from '@/components/wizard/step4-mapping';
  import { WizardStep5 } from '@/components/wizard/step5-transforms';
  import { WizardStep6 } from '@/components/wizard/step6-test';
  import { WizardStep7 } from '@/components/wizard/step7-webhook';

  export default function NewConnectionPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const form = useForm({
      defaultValues: {
        // All form fields
      }
    });

    const steps = [
      { number: 1, title: 'Credentials', component: WizardStep1 },
      { number: 2, title: 'Source', component: WizardStep2 },
      { number: 3, title: 'Target', component: WizardStep3 },
      { number: 4, title: 'Mapping', component: WizardStep4 },
      { number: 5, title: 'Transforms', component: WizardStep5 },
      { number: 6, title: 'Test', component: WizardStep6 },
      { number: 7, title: 'Webhook', component: WizardStep7 },
    ];

    const CurrentStepComponent = steps[currentStep - 1].component;

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create Connection</h1>
          <p className="text-gray-600">Step {currentStep} of 7</p>
        </div>

        <div className="mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} />
        </div>

        <Card className="p-8">
          <CurrentStepComponent
            form={form}
            onNext={() => setCurrentStep(currentStep + 1)}
            onBack={() => setCurrentStep(currentStep - 1)}
          />
        </Card>
      </div>
    );
  }
  ```
- [ ] Create step indicator component
- [ ] Test navigation between steps

### 13.2 Step 1: Credentials (components/wizard/step1-credentials.tsx)

- [ ] Create credentials form:
  - Connection name input
  - Description textarea
  - SmartSuite API key input with show/hide
  - Test connection button
  - Webflow token input with show/hide
  - Test connection button
- [ ] Implement test connection functions
- [ ] Validate before allowing Next
- [ ] Save form state

**Reference**: Section 11.5 Step 1

### 13.3 Step 2-3: Source & Target Selection

- [ ] Step 2: SmartSuite source selection
  - Fetch bases dropdown
  - Fetch tables dropdown
  - Display fields table
- [ ] Step 3: Webflow target selection
  - Fetch sites dropdown
  - Fetch collections dropdown
  - Display fields table with required indicator
- [ ] Handle loading states
- [ ] Handle API errors

**Reference**: Section 11.5 Steps 2-3

### 13.4 Step 4: Auto-Map Fields

- [ ] Create field mapping interface:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { Button } from '@/components/ui/button';
  import { Select } from '@/components/ui/select';
  import { autoMapFields } from '@/lib/auto-mapper';
  import { AdvancedMappingModal } from './advanced-mapping-modal';

  export function WizardStep4({ form, onNext, onBack }) {
    const [mappings, setMappings] = useState({});
    const [selectedField, setSelectedField] = useState(null);

    const handleAutoMap = () => {
      const ssFields = form.getValues('smartsuiteFields');
      const wfFields = form.getValues('webflowFields');
      const suggested = autoMapFields(ssFields, wfFields);
      setMappings(suggested);
    };

    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <h2 className="text-2xl font-semibold">Map Fields</h2>
          <Button onClick={handleAutoMap}>Auto-Map Similar Fields</Button>
        </div>

        <table className="w-full">
          <thead>
            <tr>
              <th>Webflow Field</th>
              <th>SmartSuite Source</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wfFields.map(field => (
              <tr key={field.slug}>
                <td>
                  {field.displayName}
                  {field.isRequired && <span className="text-red-500">*</span>}
                </td>
                <td>
                  <Select
                    value={mappings[field.slug]?.source}
                    onValueChange={(value) => {
                      setMappings({
                        ...mappings,
                        [field.slug]: { type: 'direct', source: value }
                      });
                    }}
                  >
                    <option value="">-- Select --</option>
                    {ssFields.map(ssField => (
                      <option key={ssField.slug} value={ssField.slug}>
                        {ssField.label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td>{mappings[field.slug]?.type || 'direct'}</td>
                <td>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedField(field)}
                  >
                    ⚙️
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {selectedField && (
          <AdvancedMappingModal
            field={selectedField}
            mapping={mappings[selectedField.slug]}
            onSave={(mapping) => {
              setMappings({ ...mappings, [selectedField.slug]: mapping });
              setSelectedField(null);
            }}
            onClose={() => setSelectedField(null)}
          />
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={() => {
            form.setValue('fieldMap', mappings);
            onNext();
          }}>Next</Button>
        </div>
      </div>
    );
  }
  ```
- [ ] Implement auto-map algorithm (lib/auto-mapper.ts)
- [ ] Create advanced mapping modal
- [ ] Validate required fields mapped

**Reference**: Section 11.5 Step 4

### 13.5 Steps 5-7: Transforms, Test, Webhook

- [ ] Step 5: Configure transforms
  - Slug template input
  - Status behavior checkboxes
  - Image handling settings
  - Rate limiting inputs
- [ ] Step 6: Test mapping
  - Fetch sample data button
  - Paste JSON textarea
  - Apply mapping button
  - Show input/output
  - Test upsert button
- [ ] Step 7: Webhook setup
  - Display generated webhook URL
  - Display generated secret (show once)
  - Instructions card
  - Create connection button
- [ ] Implement final submission
- [ ] Show success modal

**Reference**: Section 11.5 Steps 5-7

---

## Phase 14: Events & Items UI (Days 20-22)

### 14.1 Events Inbox (app/admin/events/page.tsx)

- [ ] Create events list page:
  ```typescript
  'use client';

  import { useState, useEffect } from 'react';
  import { DataTable } from '@/components/ui/data-table';
  import { Badge } from '@/components/ui/badge';
  import { Input } from '@/components/ui/input';
  import { Select } from '@/components/ui/select';
  import { EventDetailModal } from '@/components/events/event-detail-modal';

  export default function EventsPage() {
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const columns = [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        accessorKey: 'connection.name',
        header: 'Connection'
      },
      {
        accessorKey: 'externalId',
        header: 'ID'
      },
      {
        accessorKey: 'queuedAt',
        header: 'Time',
        cell: ({ row }) => formatRelativeTime(row.original.queuedAt)
      },
      {
        accessorKey: 'durationMs',
        header: 'Duration',
        cell: ({ row }) => row.original.durationMs
          ? `${row.original.durationMs}ms`
          : '-'
      }
    ];

    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Events</h1>

        {/* Filters */}
        <div className="flex gap-4">
          <Input placeholder="Search by ID..." />
          <Select placeholder="Status">
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="dead_letter">Dead Letter</option>
          </Select>
          <Select placeholder="Connection">
            {/* Load connections */}
          </Select>
        </div>

        <DataTable
          columns={columns}
          data={events}
          onRowClick={(row) => setSelectedEvent(row)}
        />

        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    );
  }
  ```
- [ ] Implement filters
- [ ] Add pagination
- [ ] Create status badges with colors

**Reference**: Section 11.6 (Events Inbox)

### 14.2 Event Detail Modal (components/events/event-detail-modal.tsx)

- [ ] Create modal with tabs:
  - Timeline tab showing status transitions
  - Payload tab with JSON viewer
  - Transformed tab showing mapped data
  - Response tab showing Webflow response
- [ ] For failed events:
  - Show error message prominently
  - Show stack trace (collapsible)
  - Show attempt count
- [ ] Add "Replay Event" button
- [ ] Add "View in Webflow" link
- [ ] Implement replay functionality

**Reference**: Section 11.6 (Event Detail Modal)

### 14.3 Item Inspector (app/admin/items/page.tsx)

- [ ] Create item inspector page:
  ```typescript
  'use client';

  import { useState } from 'react';
  import { Card } from '@/components/ui/card';
  import { Input } from '@/components/ui/input';
  import { Button } from '@/components/ui/button';
  import { Select } from '@/components/ui/select';
  import { CompareModal } from '@/components/items/compare-modal';

  export default function ItemsPage() {
    const [item, setItem] = useState(null);
    const [searchId, setSearchId] = useState('');
    const [connectionId, setConnectionId] = useState('');

    const handleSearch = async () => {
      const res = await fetch(
        `/api/items/lookup?connectionId=${connectionId}&externalId=${searchId}`
      );
      const data = await res.json();
      setItem(data);
    };

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Item Inspector</h1>

        <Card className="p-6">
          <div className="flex gap-4">
            <Input
              placeholder="External ID or Webflow Item ID"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <Select
              value={connectionId}
              onValueChange={setConnectionId}
            >
              {/* Load connections */}
            </Select>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </Card>

        {item && (
          <>
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Item Details</h2>
              <dl>
                <dt>External ID:</dt>
                <dd>{item.externalId}</dd>
                <dt>Webflow Item ID:</dt>
                <dd>{item.wfItemId}</dd>
                <dt>Last Synced:</dt>
                <dd>{formatDateTime(item.lastSyncedAt)}</dd>
              </dl>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Current Webflow Data</h2>
              <pre>{JSON.stringify(item.webflowData, null, 2)}</pre>
              <div className="mt-4 flex gap-2">
                <Button>View in Webflow</Button>
                <Button variant="outline">Manual Resync</Button>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold">Sync History</h2>
              {/* Show events table */}
              <Button variant="outline">Compare Syncs</Button>
            </Card>
          </>
        )}
      </div>
    );
  }
  ```
- [ ] Implement search
- [ ] Show item details
- [ ] Show sync history
- [ ] Create compare syncs modal
- [ ] Implement manual resync

**Reference**: Section 11.7 (Item Inspector)

---

## Stage 2 Testing Checklist

Before moving to Stage 3, verify these work:

### API Endpoints
- [ ] Can login with password
- [ ] Can logout
- [ ] Protected routes require authentication
- [ ] Can create connection via API
- [ ] Can update connection
- [ ] Can list connections with filters
- [ ] Can create/update mapping
- [ ] Can list events with filters
- [ ] Can replay events
- [ ] Can lookup items
- [ ] Discovery endpoints work for both APIs

### Dashboard UI
- [ ] Can login via UI
- [ ] Dashboard layout renders correctly
- [ ] Navigation works between pages
- [ ] Overview page shows metrics
- [ ] Can view connections list
- [ ] Can view connection details
- [ ] Can view events inbox with filters
- [ ] Can view event details
- [ ] Can replay events from UI
- [ ] Can search for items
- [ ] Mapping wizard works (all 7 steps)

### Responsiveness
- [ ] Works on desktop (1920px)
- [ ] Works on laptop (1366px)
- [ ] Works on tablet (768px)
- [ ] Works on mobile (375px)

### Error Handling
- [ ] Shows error messages clearly
- [ ] Handles API failures gracefully
- [ ] Shows loading states
- [ ] Validates form inputs

---

## Next Steps

Once Stage 2 is complete and tested:

1. **Manual testing**: Test complete user flows
2. **UI polish**: Fix any layout issues, improve UX
3. **Commit your work**: Git commit with clear message
4. **Move to Stage 3**: Testing, documentation, deployment

---

## Success Criteria for Stage 2

✅ Complete REST API for all operations
✅ Full dashboard UI for managing connections
✅ 7-step mapping wizard works end-to-end
✅ Events inbox with filtering and detail view
✅ Item inspector for troubleshooting
✅ All pages responsive on various screen sizes
✅ Proper error handling and loading states
✅ Ready for production deployment

**Estimated Completion**: End of Week 4
**Next**: Stage 3 - Testing, Documentation & Deployment
