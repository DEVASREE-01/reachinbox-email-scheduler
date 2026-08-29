import { Client } from '@elastic/elasticsearch';
import { env } from './env';
import { logger } from '../utils/logger';

const clientOptions: any = {
  node: env.ELASTICSEARCH_URL,
  requestTimeout: 5000,
  maxRetries: 2,
};

if (env.ELASTICSEARCH_API_KEY) {
  clientOptions.auth = { apiKey: env.ELASTICSEARCH_API_KEY };
} else if (env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD) {
  clientOptions.auth = {
    username: env.ELASTICSEARCH_USERNAME,
    password: env.ELASTICSEARCH_PASSWORD,
  };
}

export const esClient = new Client(clientOptions);

export async function connectElasticsearch() {
  try {
    const health = await esClient.ping();
    if (health) {
      logger.info(`🔌 Connected to Elasticsearch at ${env.ELASTICSEARCH_URL}`);
      return true;
    }
    logger.warn('⚠️ Elasticsearch ping returned false');
    return false;
  } catch (error) {
    logger.warn({ err: error }, '⚠️ Elasticsearch is not reachable. Indexing will fail but app will continue running.');
    return false;
  }
}
