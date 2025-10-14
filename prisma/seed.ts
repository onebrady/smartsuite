import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encryptSecret } from '../lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test connection (paused by default for safety)
  const ssApiKey = await encryptSecret('test-smartsuite-api-key');
  const wfToken = await encryptSecret('test-webflow-token');
  const webhookSecret = 'test-webhook-secret';

  const connection = await prisma.connection.create({
    data: {
      name: 'Test Products Sync',
      status: 'paused', // Don't activate automatically
      sourceType: 'smartsuite',
      ssBaseId: 'test_base_id',
      ssTableId: 'test_table_id',
      ssApiKeyEnc: ssApiKey.ciphertext,
      ssApiKeyIv: ssApiKey.iv,
      targetType: 'webflow',
      wfSiteId: 'test_site_id',
      wfCollectionId: 'test_collection_id',
      wfTokenEnc: wfToken.ciphertext,
      wfTokenIv: wfToken.iv,
      webhookSecretHash: await bcrypt.hash(webhookSecret, 10),
      webhookUrl: `http://localhost:3000/api/hooks/test-connection`,
      rateLimitPerMin: 50,
      maxRetries: 5,
      retryBackoffMs: 1000,
    },
  });

  console.log(`✅ Created test connection: ${connection.id}`);

  // Create a sample mapping for the connection
  const mapping = await prisma.mapping.create({
    data: {
      connectionId: connection.id,
      fieldMap: {
        name: {
          type: 'direct',
          source: '$.title',
        },
        slug: {
          type: 'direct',
          source: '$.sku',
          transform: 'kebab',
        },
        'price-field': {
          type: 'direct',
          source: '$.price',
        },
        description: {
          type: 'template',
          template: '{{title}} - SKU: {{sku}}',
        },
      },
      slugTemplate: '{{sku}}',
      requiredFields: ['name', 'slug'],
    },
  });

  console.log(`✅ Created test mapping: ${mapping.id}`);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\nTest connection details:');
  console.log(`  - Connection ID: ${connection.id}`);
  console.log(`  - Webhook URL: ${connection.webhookUrl}`);
  console.log(`  - Webhook Secret: ${webhookSecret}`);
  console.log(`  - Status: ${connection.status} (change to 'active' to enable)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
