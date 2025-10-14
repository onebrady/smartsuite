import type {
  Connection,
  Mapping,
  Event,
  IdMap,
  AnalyticsDaily,
  AuditLog,
  DistributedLock,
  EventStatus,
  ConnectionStatus,
  SourceType,
  TargetType,
} from '@prisma/client';

// Re-export Prisma types
export type {
  Connection,
  Mapping,
  Event,
  IdMap,
  AnalyticsDaily,
  AuditLog,
  DistributedLock,
  EventStatus,
  ConnectionStatus,
  SourceType,
  TargetType,
};

// Field mapping type (enum was removed from schema)
export type FieldMappingType =
  | 'direct'
  | 'jsonata'
  | 'template'
  | 'constant'
  | 'reference';

export { type FieldMappingType as FieldMappingTypeEnum };

// Connection with relations
export type ConnectionWithMappings = Connection & {
  mappings: Mapping[];
};

export type ConnectionWithRelations = Connection & {
  mappings: Mapping[];
  events: Event[];
  idMaps: IdMap[];
};

// Event with relations
export type EventWithConnection = Event & {
  connection: Connection;
};

export type EventWithConnectionAndMapping = Event & {
  connection: ConnectionWithMappings;
};

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Webhook types
export interface WebhookPayload {
  event_type?: string;
  record_id?: string;
  data: any;
  timestamp?: string;
}

// Dashboard types
export interface DashboardStats {
  totalConnections: number;
  activeConnections: number;
  totalEvents: number;
  queueDepth: number;
  successRate: number;
  avgProcessingTime: number;
}

export interface ConnectionHealth {
  status: ConnectionStatus;
  lastSuccess: Date | null;
  lastError: Date | null;
  consecutiveErrors: number;
  successRate: number;
}

// Queue types
export interface QueueStats {
  depth: number;
  oldestAge: number;
  processing: number;
  failed: number;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}
