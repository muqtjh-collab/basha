import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Fetching database record counts...');
  
  const roles = await prisma.role.count();
  const users = await prisma.user.count();
  const branches = await prisma.branch.count();
  const customers = await prisma.customer.count();
  const vehicles = await prisma.vehicle.count();
  const wallets = await prisma.wallet.count();
  const walletTransactions = await prisma.walletTransaction.count();
  const receipts = await prisma.receipt.count();
  const notifications = await prisma.notification.count();
  const auditLogs = await prisma.auditLog.count();
  
  // Count agents specifically (users whose role.name contains 'agent')
  const agents = await prisma.user.count({
    where: {
      role: {
        name: {
          contains: 'agent'
        }
      }
    }
  });

  console.log('====================================');
  console.log(`Roles: ${roles}`);
  console.log(`Users (total): ${users}`);
  console.log(`Agents: ${agents}`);
  console.log(`Branches: ${branches}`);
  console.log(`Customers: ${customers}`);
  console.log(`Vehicles: ${vehicles}`);
  console.log(`Wallets: ${wallets}`);
  console.log(`Wallet Transactions: ${walletTransactions}`);
  console.log(`Receipts: ${receipts}`);
  console.log(`Notifications: ${notifications}`);
  console.log(`Audit Logs: ${auditLogs}`);
  console.log('====================================');
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
