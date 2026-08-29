import { esClient } from '../config/elasticsearch';
import { logger } from '../utils/logger';

const INDEX_NAME = 'emails';

export interface EmailSearchDoc {
  id: string;
  campaignId: string;
  senderId: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
  createdAt: string;
}

/**
 * Initializes the Elasticsearch index with appropriate mappings.
 */
export async function initializeSearchIndex() {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            campaignId: { type: 'keyword' },
            senderId: { type: 'keyword' },
            userId: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      logger.info(`🔍 Elasticsearch index "${INDEX_NAME}" created with mappings`);
    } else {
      logger.info(`🔍 Elasticsearch index "${INDEX_NAME}" already exists`);
    }
  } catch (error) {
    logger.warn({ err: error }, '⚠️ Failed to initialize Elasticsearch index. Search indexing will be unavailable.');
  }
}

/**
 * Indexes a new email document in Elasticsearch.
 * Fails gracefully (logs error) to avoid interrupting main email flows.
 */
export async function indexEmail(doc: EmailSearchDoc) {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });
    logger.info({ emailId: doc.id }, 'Indexed email in Elasticsearch');
  } catch (error) {
    logger.error({ err: error, emailId: doc.id }, '❌ Elasticsearch indexing failure');
  }
}

/**
 * Updates status and properties of an existing indexed email document.
 */
export async function updateEmailStatusInSearch(
  emailId: string,
  status: string,
  extra: Partial<EmailSearchDoc> = {}
) {
  try {
    const exists = await esClient.exists({ index: INDEX_NAME, id: emailId });
    if (!exists) {
      logger.warn({ emailId }, 'Email not found in Elasticsearch for status update');
      return;
    }

    await esClient.update({
      index: INDEX_NAME,
      id: emailId,
      doc: {
        status,
        ...extra,
      },
      refresh: 'wait_for',
    });
    logger.info({ emailId, status }, 'Updated email status in Elasticsearch');
  } catch (error) {
    logger.error({ err: error, emailId }, '❌ Elasticsearch update failure');
  }
}

/**
 * Searches emails belonging to a specific user.
 * Scopes searching to the authenticated user's `userId`.
 */
export async function searchEmails(
  userId: string,
  queryText: string,
  page: number = 1,
  limit: number = 20
) {
  try {
    const from = (page - 1) * limit;

    let query: any;
    if (queryText.trim() === '') {
      query = {
        term: { userId },
      };
    } else {
      query = {
        bool: {
          must: [
            { term: { userId } },
            {
              multi_match: {
                query: queryText,
                fields: ['recipient', 'recipient.keyword', 'subject', 'body', 'status'],
                fuzziness: 'AUTO',
                operator: 'or',
              },
            },
          ],
        },
      };
    }

    const response = await esClient.search({
      index: INDEX_NAME,
      query,
      from,
      size: limit,
      sort: [{ scheduledAt: 'desc' }],
    });

    const hits = response.hits.hits;
    const totalHits = typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value || 0;

    const items = hits.map((hit) => hit._source as EmailSearchDoc);
    const totalPages = Math.ceil(totalHits / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total: totalHits,
        totalPages,
      },
    };
  } catch (error) {
    logger.warn({ err: error, userId, queryText }, '⚠️ Elasticsearch search failed. Falling back to database query.');
    
    const { prisma } = require('../config/database');
    const skip = (page - 1) * limit;
    
    const whereClause: any = {
      campaign: { userId },
    };
    
    if (queryText.trim() !== '') {
      whereClause.OR = [
        { recipient: { contains: queryText, mode: 'insensitive' } },
        { subject: { contains: queryText, mode: 'insensitive' } },
        { body: { contains: queryText, mode: 'insensitive' } },
      ];
    }
    
    const [items, total] = await Promise.all([
      prisma.email.findMany({
        where: whereClause,
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.email.count({
        where: whereClause,
      }),
    ]);
    
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
