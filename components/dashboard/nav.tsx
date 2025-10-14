'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Link2, List, Settings, LogOut } from 'lucide-react';

export function DashboardNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin', label: 'Overview', icon: Home },
    { href: '/admin/connections', label: 'Connections', icon: Link2 },
    { href: '/admin/events', label: 'Events', icon: List },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

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
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
    </nav>
  );
}
