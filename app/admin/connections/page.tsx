'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, ExternalLink } from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  description?: string;
  status: string;
  sourceType: string;
  targetType: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  consecutiveErrors: number;
  createdAt: string;
}

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, [search]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/connections?${params}`);
      const data = await res.json();
      setConnections(data.connections);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
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
          placeholder="Search connections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : connections.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">No connections found</p>
          <Link href="/admin/connections/new">
            <Button>Create Your First Connection</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection) => (
            <Card key={connection.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Link
                      href={`/admin/connections/${connection.id}`}
                      className="text-xl font-semibold hover:text-blue-600"
                    >
                      {connection.name}
                    </Link>
                    <Badge className={getStatusColor(connection.status)}>
                      {connection.status}
                    </Badge>
                  </div>
                  {connection.description && (
                    <p className="text-gray-600 mb-3">
                      {connection.description}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>
                      {connection.sourceType} → {connection.targetType}
                    </span>
                    {connection.lastSuccessAt && (
                      <span>
                        Last success:{' '}
                        {new Date(connection.lastSuccessAt).toLocaleString()}
                      </span>
                    )}
                    {connection.consecutiveErrors > 0 && (
                      <span className="text-red-600">
                        {connection.consecutiveErrors} consecutive errors
                      </span>
                    )}
                  </div>
                </div>
                <Link href={`/admin/connections/${connection.id}`}>
                  <Button variant="outline" size="sm">
                    <ExternalLink size={16} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
