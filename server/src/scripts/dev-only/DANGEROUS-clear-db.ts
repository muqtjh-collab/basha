// ============================================
// DANGER: DESTRUCTIVE SCRIPT — DEVELOPMENT ONLY
// This script permanently deletes ALL data
// from the database. It must NEVER be run in
// production. It must NEVER run automatically.
// It requires explicit manual developer action.
// It is NOT part of any migration workflow.
// ============================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing database schema public...');
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE');
  await prisma.$executeRawUnsafe('CREATE SCHEMA public');
  await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public');
  console.log('✅ Database schema cleared.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
