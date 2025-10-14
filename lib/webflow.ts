import { fetch } from 'undici';
import { logger } from './logger';
import { prisma } from './db';
import type { Connection } from '@prisma/client';

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';
const REQUEST_TIMEOUT = 30000; // 30 seconds

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  previewUrl: string;
}

export interface WebflowCollection {
  id: string;
  displayName: string;
  slug: string;
  singularName: string;
}

export interface WebflowCollectionSchema {
  id: string;
  displayName: string;
  slug: string;
  fields: WebflowField[];
}

export interface WebflowField {
  id: string;
  slug: string;
  displayName: string;
  type: string;
  isRequired: boolean;
}

export interface WebflowItem {
  id: string;
  cmsLocaleId: string;
  lastPublished: string | null;
  lastUpdated: string;
  createdOn: string;
  isArchived: boolean;
  isDraft: boolean;
  fieldData: Record<string, any>;
}

export interface UpsertResult {
  wfItemId: string;
  response: WebflowItem;
  warnings: string[];
}

export class WebflowClient {
  private async request<T>(
    endpoint: string,
    token: string,
    options?: any
  ): Promise<T> {
    const url = `${WEBFLOW_API_BASE}${endpoint}`;

    const log = logger.child({ service: 'webflow', endpoint });

    try {
      log.debug('Webflow API request');

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options?.headers,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        log.error({ status: response.status, errorBody }, 'Webflow API error');

        const error: any = new Error(
          `Webflow API error: ${response.status} ${response.statusText}`
        );
        error.status = response.status;
        error.statusCode = response.status;
        error.body = errorBody;
        throw error;
      }

      const data = await response.json();
      log.debug('Webflow API response received');

      return data as T;
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        log.error('Webflow API request timeout');
        const timeoutError: any = new Error('Request timeout');
        timeoutError.code = 'ETIMEDOUT';
        throw timeoutError;
      }
      throw error;
    }
  }

  /**
   * Get all sites
   */
  async getSites(token: string): Promise<WebflowSite[]> {
    const response = await this.request<{ sites: WebflowSite[] }>(
      '/sites',
      token
    );
    return response.sites;
  }

  /**
   * Get all collections in a site
   */
  async getCollections(
    token: string,
    siteId: string
  ): Promise<WebflowCollection[]> {
    const response = await this.request<{ collections: WebflowCollection[] }>(
      `/sites/${siteId}/collections`,
      token
    );
    return response.collections;
  }

  /**
   * Get collection schema
   */
  async getCollectionSchema(
    token: string,
    collectionId: string
  ): Promise<WebflowCollectionSchema> {
    return this.request<WebflowCollectionSchema>(
      `/collections/${collectionId}`,
      token
    );
  }

  /**
   * Create a new item in a collection
   */
  async createItem(
    token: string,
    collectionId: string,
    fieldData: Record<string, any>,
    options?: {
      isDraft?: boolean;
      cmsLocaleId?: string;
    }
  ): Promise<WebflowItem> {
    const response = await this.request<WebflowItem>(
      `/collections/${collectionId}/items/live`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({
          fieldData,
          ...(options?.isDraft !== undefined && { isDraft: options.isDraft }),
          ...(options?.cmsLocaleId && { cmsLocaleId: options.cmsLocaleId }),
        }),
      }
    );
    return response;
  }

  /**
   * Update an existing item
   */
  async updateItem(
    token: string,
    collectionId: string,
    itemId: string,
    fieldData: Record<string, any>,
    options?: {
      isDraft?: boolean;
      cmsLocaleId?: string;
    }
  ): Promise<WebflowItem> {
    const response = await this.request<WebflowItem>(
      `/collections/${collectionId}/items/${itemId}/live`,
      token,
      {
        method: 'PATCH',
        body: JSON.stringify({
          fieldData,
          ...(options?.isDraft !== undefined && { isDraft: options.isDraft }),
          ...(options?.cmsLocaleId && { cmsLocaleId: options.cmsLocaleId }),
        }),
      }
    );
    return response;
  }

  /**
   * Delete an item
   */
  async deleteItem(
    token: string,
    collectionId: string,
    itemId: string
  ): Promise<void> {
    await this.request<void>(
      `/collections/${collectionId}/items/${itemId}`,
      token,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Upsert an item (create or update based on IdMap)
   */
  async upsertWebflowItem(
    connection: Connection,
    externalId: string,
    fieldData: Record<string, any>,
    wfToken: string
  ): Promise<UpsertResult> {
    const warnings: string[] = [];
    const log = logger.child({
      connectionId: connection.id,
      externalId,
    });

    // Check IdMap for existing item
    const existing = await prisma.idMap.findUnique({
      where: {
        connectionId_externalSource_externalId: {
          connectionId: connection.id,
          externalSource: 'smartsuite',
          externalId: externalId,
        },
      },
    });

    let response: WebflowItem;

    if (existing) {
      // Update existing item
      log.info({ wfItemId: existing.wfItemId }, 'Updating existing Webflow item');

      response = await this.updateItem(
        wfToken,
        connection.wfCollectionId,
        existing.wfItemId,
        fieldData
      );

      // Update IdMap
      await prisma.idMap.update({
        where: { id: existing.id },
        data: { lastSyncedAt: new Date() },
      });
    } else {
      // Create new item with slug collision handling
      log.info('Creating new Webflow item');

      let slug = fieldData.slug;
      let attempt = 0;

      while (attempt < 10) {
        try {
          response = await this.createItem(
            wfToken,
            connection.wfCollectionId,
            { ...fieldData, slug }
          );

          // Success - create IdMap entry
          await prisma.idMap.create({
            data: {
              connectionId: connection.id,
              externalSource: 'smartsuite',
              externalId: externalId,
              wfItemId: response.id,
            },
          });

          if (attempt > 0) {
            warnings.push(`Slug collision resolved with suffix: ${slug}`);
          }

          break;
        } catch (err: any) {
          // Check if it's a slug collision error
          if (
            err.status === 409 ||
            (err.body &&
              typeof err.body === 'string' &&
              err.body.toLowerCase().includes('slug'))
          ) {
            attempt++;
            slug = `${fieldData.slug}-${attempt}`;
            log.warn({ attempt, newSlug: slug }, 'Slug collision, retrying');
            continue;
          }

          // Non-slug error - throw it
          throw err;
        }
      }

      if (attempt >= 10) {
        throw new Error('Failed to resolve slug collision after 10 attempts');
      }
    }

    return {
      wfItemId: response!.id,
      response: response!,
      warnings,
    };
  }
}

export const webflowClient = new WebflowClient();
