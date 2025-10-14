import { fetch } from 'undici';
import { logger } from './logger';

const SMARTSUITE_API_BASE = 'https://app.smartsuite.com/api/v1';
const REQUEST_TIMEOUT = 30000; // 30 seconds

export interface SmartSuiteBase {
  id: string;
  name: string;
  structure: string;
}

export interface SmartSuiteTable {
  id: string;
  name: string;
  structure: string;
}

export interface SmartSuiteField {
  slug: string;
  label: string;
  field_type: string;
  params?: any;
}

export interface SmartSuiteSchema {
  structure: Array<{
    slug: string;
    label: string;
    field_type: string;
    params?: any;
  }>;
}

export interface SmartSuiteRecord {
  id: string;
  [key: string]: any;
}

export class SmartSuiteClient {
  private async request<T>(
    endpoint: string,
    apiKey: string,
    options?: any
  ): Promise<T> {
    const url = `${SMARTSUITE_API_BASE}${endpoint}`;

    const log = logger.child({ service: 'smartsuite', endpoint });

    try {
      log.debug('SmartSuite API request');

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${apiKey}`,
          ...options?.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        log.error(
          { status: response.status, errorBody },
          'SmartSuite API error'
        );

        const error: any = new Error(
          `SmartSuite API error: ${response.status} ${response.statusText}`
        );
        error.status = response.status;
        error.statusCode = response.status;
        error.body = errorBody;
        throw error;
      }

      const data = await response.json();
      log.debug('SmartSuite API response received');

      return data as T;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        log.error('SmartSuite API request timeout');
        const timeoutError: any = new Error('Request timeout');
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }
      throw error;
    }
  }

  /**
   * Get all bases
   */
  async getBases(apiKey: string): Promise<SmartSuiteBase[]> {
    return this.request<SmartSuiteBase[]>('/bases', apiKey);
  }

  /**
   * Get all tables (apps) in a base
   */
  async getTables(apiKey: string, baseId: string): Promise<SmartSuiteTable[]> {
    return this.request<SmartSuiteTable[]>(`/bases/${baseId}/apps`, apiKey);
  }

  /**
   * Get schema for a table
   */
  async getSchema(
    apiKey: string,
    baseId: string,
    tableId: string
  ): Promise<SmartSuiteSchema> {
    return this.request<SmartSuiteSchema>(
      `/bases/${baseId}/apps/${tableId}/schema`,
      apiKey
    );
  }

  /**
   * Get records from a table
   */
  async getRecords(
    apiKey: string,
    baseId: string,
    tableId: string,
    options?: {
      limit?: number;
      offset?: number;
      filter?: any;
    }
  ): Promise<SmartSuiteRecord[]> {
    const queryParams = new URLSearchParams();

    if (options?.limit) {
      queryParams.append('limit', options.limit.toString());
    }
    if (options?.offset) {
      queryParams.append('offset', options.offset.toString());
    }

    const endpoint = `/bases/${baseId}/apps/${tableId}/records${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

    const requestOptions: RequestInit = options?.filter
      ? {
          method: 'POST',
          body: JSON.stringify({ filter: options.filter }),
        }
      : {};

    return this.request<SmartSuiteRecord[]>(endpoint, apiKey, requestOptions);
  }
}

export const smartsuiteClient = new SmartSuiteClient();
