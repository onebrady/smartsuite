import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { DashboardNav } from '@/components/dashboard/nav';

export default async function AdminLayout({
  children,
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
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
