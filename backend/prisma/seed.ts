import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data (in correct order due to FK constraints)
  console.log('🧹 Cleaning existing data...');
  await prisma.review.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.escrowLedger.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.annotationNormalized.deleteMany();
  await prisma.annotationRaw.deleteMany();
  await prisma.taskLease.deleteMany();
  await prisma.task.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.label.deleteMany();
  await prisma.labelSet.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.user.deleteMany();

  // =========================================================================
  // 1. Create Users
  // =========================================================================
  console.log('👤 Creating users...');
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@datalabeling.com',
      passwordHash: '$2b$10$placeholder_hash_for_admin', // "password123" hashed
      role: UserRole.admin,
      displayName: 'Platform Admin',
    },
  });

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@example.com',
      passwordHash: '$2b$10$placeholder_hash_for_client',
      role: UserRole.client,
      displayName: 'Demo Client',
    },
  });

  const labelerUser = await prisma.user.create({
    data: {
      email: 'labeler@example.com',
      passwordHash: '$2b$10$placeholder_hash_for_labeler',
      role: UserRole.labeler,
      displayName: 'Demo Labeler',
      ratingAvg: 4.5,
    },
  });

  console.log(`   ✅ Created ${3} users`);

  // =========================================================================
  // 2. Create Label Sets
  // =========================================================================
  console.log('🏷️  Creating label sets...');

  const objectDetectionLabelSet = await prisma.labelSet.create({
    data: {
      ownerUserId: clientUser.id,
      name: 'Object Detection - Vehicles & Pedestrians',
      version: 1,
    },
  });

  console.log(`   ✅ Created 1 label set`);

  // =========================================================================
  // 3. Create Labels
  // =========================================================================
  console.log('🎨 Creating labels...');

  const labels = await Promise.all([
    prisma.label.create({
      data: {
        labelSetId: objectDetectionLabelSet.id,
        name: 'person',
        color: '#FF6B6B',
        attributesSchemaJson: {
          type: 'object',
          properties: {
            occluded: { type: 'boolean' },
            truncated: { type: 'boolean' },
          },
        },
      },
    }),
    prisma.label.create({
      data: {
        labelSetId: objectDetectionLabelSet.id,
        name: 'car',
        color: '#4ECDC4',
        attributesSchemaJson: {
          type: 'object',
          properties: {
            occluded: { type: 'boolean' },
            color: { type: 'string', enum: ['red', 'blue', 'white', 'black', 'gray', 'other'] },
          },
        },
      },
    }),
    prisma.label.create({
      data: {
        labelSetId: objectDetectionLabelSet.id,
        name: 'truck',
        color: '#45B7D1',
        attributesSchemaJson: {
          type: 'object',
          properties: {
            occluded: { type: 'boolean' },
            vehicleType: { type: 'string', enum: ['pickup', 'semi', 'delivery', 'other'] },
          },
        },
      },
    }),
  ]);

  console.log(`   ✅ Created ${labels.length} labels`);

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n✨ Seed completed successfully!');
  console.log('─'.repeat(50));
  console.log('Created:');
  console.log(`   • 1 Admin: ${adminUser.email}`);
  console.log(`   • 1 Client: ${clientUser.email}`);
  console.log(`   • 1 Labeler: ${labelerUser.email}`);
  console.log(`   • 1 Label Set: "${objectDetectionLabelSet.name}"`);
  console.log(`   • 3 Labels: person, car, truck`);
  console.log('─'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
