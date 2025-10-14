'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  status: string;
  externalId: string;
  queuedAt: string;
  processedAt?: string;
  durationMs?: number;
  error?: string;
  connection: {
    name: string;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [search, statusFilter]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('externalId', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      setEvents(data.events);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-orange-100 text-orange-800';
      case 'dead_letter':
        return 'bg-red-100 text-red-800';
      case 'skipped':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Events</h1>

      <div className="flex gap-4">
        <Input
          placeholder="Search by ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="queued">Queued</option>
          <option value="processing">Processing</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="dead_letter">Dead Letter</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : events.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-600">No events found</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Connection</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Queued</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.connection.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {event.externalId.substring(0, 12)}...
                  </TableCell>
                  <TableCell>
                    {new Date(event.queuedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {event.durationMs ? `${event.durationMs}ms` : '-'}
                  </TableCell>
                  <TableCell>
                    {(event.status === 'failed' ||
                      event.status === 'dead_letter') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await fetch(`/api/events/${event.id}/replay`, {
                            method: 'POST',
                          });
                          fetchEvents();
                        }}
                      >
                        Replay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
