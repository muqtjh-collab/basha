import bcrypt from 'bcrypt';
import { PrismaClient, UserStatus, VehicleStage, UserTrackingStage, AuctionSource, DocumentCategory, AttachmentType, WalletStatus, Currency, ReceiptStatus, NotificationType, AuditAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data (order is important due to foreign keys)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.receipt.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.vehicleAttachment.deleteMany();
  await prisma.vehicleStageTransition.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.role.deleteMany();
  await prisma.systemSetting.deleteMany();

  console.log('🧹 Database cleaned.');

  // 2. Hash standard passwords
  const adminHash = await bcrypt.hash('admin123', 10);
  const agentHash = await bcrypt.hash('agent123', 10);
  const customerHash = await bcrypt.hash('customer123', 10);
  const generalHash = await bcrypt.hash('password123', 10);

  // 3. Create Roles
  const roles = [
    {
      name: 'super_admin',
      nameAr: 'المدير العام',
      level: 1,
      isSystem: true,
      description: 'Full system access',
      descriptionAr: 'صلاحيات كاملة لإدارة النظام والتحكم بجميع العمليات.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: true },
        customers: { read: true, write: true, delete: true },
        wallets: { read: true, write: true },
        agents: { read: true, write: true },
        reports: { read: true },
        audit_log: { read: true },
        settings: { read: true, write: true },
        roles: { read: true, write: true },
        branches: { read: true, write: true }
      }
    },
    {
      name: 'operations_manager',
      nameAr: 'مدير العمليات',
      level: 2,
      isSystem: true,
      description: 'Operations control',
      descriptionAr: 'إدارة شؤون الشحن والسيارات والوكلاء مع صلاحيات مالية محدودة.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        wallets: { read: true, write: true },
        agents: { read: true, write: false },
        reports: { read: true },
        audit_log: { read: true },
        settings: { read: true, write: false },
        roles: { read: true, write: false },
        branches: { read: true, write: false }
      }
    },
    {
      name: 'branch_manager',
      nameAr: 'مدير فرع',
      level: 3,
      isSystem: true,
      description: 'Branch management',
      descriptionAr: 'إدارة وتفقد عمليات الفرع الجغرافي والوكلاء التابعين له.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        wallets: { read: true, write: false },
        agents: { read: true, write: false },
        reports: { read: true },
        audit_log: { read: false },
        settings: { read: false, write: false },
        roles: { read: false, write: false },
        branches: { read: true, write: false }
      }
    },
    {
      name: 'senior_agent',
      nameAr: 'وكيل أول',
      level: 4,
      isSystem: true,
      description: 'Senior field agent',
      descriptionAr: 'تسجيل السيارات وتسييرها وإدارة المحفظة والعملاء التابعين له.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        wallets: { read: true, write: false },
        agents: { read: false, write: false },
        reports: { read: false },
        audit_log: { read: false },
        settings: { read: false, write: false },
        roles: { read: false, write: false },
        branches: { read: true, write: false }
      }
    },
    {
      name: 'junior_agent',
      nameAr: 'وكيل مبتدئ',
      level: 5,
      isSystem: true,
      description: 'Junior field agent',
      descriptionAr: 'صلاحيات محدودة للوكلاء الجدد لإدارة سياراتهم الخاصة فقط.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: false },
        customers: { read: true, write: true, delete: false },
        wallets: { read: true, write: false },
        agents: { read: false, write: false },
        reports: { read: false },
        audit_log: { read: false },
        settings: { read: false, write: false },
        roles: { read: false, write: false },
        branches: { read: false, write: false }
      }
    },
    {
      name: 'support_staff',
      nameAr: 'موظف الدعم',
      level: 6,
      isSystem: true,
      description: 'Data entry support',
      descriptionAr: 'إدخال البيانات ومساعدة الوكلاء في رفع المستندات.',
      defaultPermissions: {
        vehicles: { read: true, write: true, delete: false },
        customers: { read: true, write: false, delete: false },
        wallets: { read: false, write: false },
        agents: { read: false, write: false },
        reports: { read: false },
        audit_log: { read: false },
        settings: { read: false, write: false },
        roles: { read: false, write: false },
        branches: { read: false, write: false }
      }
    },
    {
      name: 'customer',
      nameAr: 'عميل',
      level: 10,
      isSystem: true,
      description: 'End buyer customer',
      descriptionAr: 'صلاحية تتبع الشحنات الخاصة بالعميل فقط ومستنداتها المرئية.',
      defaultPermissions: {
        vehicles: { read: true, write: false, delete: false }
      }
    }
  ];

  const createdRoles: Record<string, any> = {};
  for (const role of roles) {
    const dbRole = await prisma.role.create({
      data: role
    });
    createdRoles[role.name] = dbRole;
  }
  console.log('✅ Roles created.');

  // 4. Create Branches
  const branches = [
    { name: 'Baghdad Branch', nameAr: 'فرع بغداد الرئيسي', city: 'Baghdad', cityAr: 'بغداد', region: 'Karrada', regionAr: 'الكرادة' },
    { name: 'Basra Branch', nameAr: 'فرع البصرة', city: 'Basra', cityAr: 'البصرة', region: 'Ashar', regionAr: 'العشار' }
  ];

  const createdBranches: any[] = [];
  for (const branch of branches) {
    const dbBranch = await prisma.branch.create({
      data: branch
    });
    createdBranches.push(dbBranch);
  }
  console.log('✅ Branches created.');

  // 5. Create System Settings
  const settings = [
    { key: 'company_name', value: { ar: 'شركة الباشا لاستيراد السيارات' }, description: 'اسم الشركة بالعربية' },
    { key: 'default_currency', value: { code: 'USD' }, description: 'العملة الافتراضية' },
    { key: 'file_limits', value: { image: 10 * 1024 * 1024, pdf: 20 * 1024 * 1024, video: 100 * 1024 * 1024 }, description: 'حدود حجم الملفات بايت' }
  ];

  for (const setting of settings) {
    await prisma.systemSetting.create({
      data: setting
    });
  }
  console.log('✅ System Settings created.');

  // 6. Create Users (Admin, Ops, Branch Managers, Agents, Support)
  // Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@albasha.local',
      passwordHash: adminHash,
      fullName: 'Super Admin',
      fullNameAr: 'المدير العام',
      roleId: createdRoles['super_admin'].id,
      status: 'active'
    }
  });

  // Operations Manager
  const opsManager = await prisma.user.create({
    data: {
      username: 'ops',
      email: 'ops@albasha.local',
      passwordHash: generalHash,
      fullName: 'Operations Manager',
      fullNameAr: 'مدير العمليات',
      roleId: createdRoles['operations_manager'].id,
      status: 'active',
      createdBy: superAdmin.id
    }
  });

  // Branch Managers (1 per branch)
  const managerBaghdad = await prisma.user.create({
    data: {
      username: 'mgr_baghdad',
      email: 'baghdad_mgr@albasha.local',
      passwordHash: generalHash,
      fullName: 'Baghdad Manager',
      fullNameAr: 'مدير فرع بغداد',
      roleId: createdRoles['branch_manager'].id,
      branchId: createdBranches[0].id,
      status: 'active',
      createdBy: superAdmin.id,
      geographicScope: [createdBranches[0].id]
    }
  });

  const managerBasra = await prisma.user.create({
    data: {
      username: 'mgr_basra',
      email: 'basra_mgr@albasha.local',
      passwordHash: generalHash,
      fullName: 'Basra Manager',
      fullNameAr: 'مدير فرع البصرة',
      roleId: createdRoles['branch_manager'].id,
      branchId: createdBranches[1].id,
      status: 'active',
      createdBy: superAdmin.id,
      geographicScope: [createdBranches[1].id]
    }
  });

  // Agents (2 per branch: 1 Senior, 1 Junior)
  // Baghdad Agents
  const agent1 = await prisma.user.create({
    data: {
      username: 'agent1',
      email: 'agent1@albasha.local',
      passwordHash: agentHash,
      fullName: 'Senior Agent Baghdad',
      fullNameAr: 'أحمد التميمي (وكيل أول)',
      roleId: createdRoles['senior_agent'].id,
      branchId: createdBranches[0].id,
      status: 'active',
      createdBy: managerBaghdad.id
    }
  });

  const agent2 = await prisma.user.create({
    data: {
      username: 'agent2',
      email: 'agent2@albasha.local',
      passwordHash: generalHash,
      fullName: 'Junior Agent Baghdad',
      fullNameAr: 'محمد الكناني (وكيل مبتدئ)',
      roleId: createdRoles['junior_agent'].id,
      branchId: createdBranches[0].id,
      status: 'active',
      createdBy: managerBaghdad.id
    }
  });

  // Basra Agents
  const agent3 = await prisma.user.create({
    data: {
      username: 'agent3',
      email: 'agent3@albasha.local',
      passwordHash: generalHash,
      fullName: 'Senior Agent Basra',
      fullNameAr: 'مصطفى الربيعي (وكيل أول)',
      roleId: createdRoles['senior_agent'].id,
      branchId: createdBranches[1].id,
      status: 'active',
      createdBy: managerBasra.id
    }
  });

  const agent4 = await prisma.user.create({
    data: {
      username: 'agent4',
      email: 'agent4@albasha.local',
      passwordHash: generalHash,
      fullName: 'Junior Agent Basra',
      fullNameAr: 'حسين الخفاجي (وكيل مبتدئ)',
      roleId: createdRoles['junior_agent'].id,
      branchId: createdBranches[1].id,
      status: 'active',
      createdBy: managerBasra.id
    }
  });

  // Support Staff
  const supportStaff = await prisma.user.create({
    data: {
      username: 'support',
      email: 'support@albasha.local',
      passwordHash: generalHash,
      fullName: 'Support Staff',
      fullNameAr: 'علي الساعدي (الدعم الفني)',
      roleId: createdRoles['support_staff'].id,
      status: 'active',
      createdBy: superAdmin.id
    }
  });

  console.log('✅ Corporate Users created.');

  // 7. Create Wallets for Agents
  const agents = [agent1, agent2, agent3, agent4];
  const createdWallets: Record<string, any> = {};

  // Varying balances: USD in cents, IQD in fils
  const agentBalances = [
    { usd: 1550000, iqd: 500000000 },  // Agent 1: $15,500.00 & 500,000 د.ع
    { usd: 420000, iqd: 250000000 },   // Agent 2: $4,200.00  & 250,000 د.ع
    { usd: 2890000, iqd: 1200000000 }, // Agent 3: $28,900.00 & 1,200,000 د.ع
    { usd: 0, iqd: 0 }                  // Agent 4: $0 & 0 د.ع
  ];

  for (let i = 0; i < agents.length; i++) {
    const agentObj = agents[i];
    const balance = agentBalances[i];
    const wallet = await prisma.wallet.create({
      data: {
        agentId: agentObj.id,
        balanceUsd: balance.usd,
        balanceIqd: balance.iqd,
        status: 'active'
      }
    });
    createdWallets[agentObj.id] = wallet;

    // Add initial deposits to wallet transactions history
    if (balance.usd > 0) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'deposit',
          amount: balance.usd,
          currency: 'USD',
          description: 'Initial deposit by admin',
          descriptionAr: 'رصيد ابتدائي مودع من قبل المدير العام',
          referenceType: 'manual',
          performedBy: superAdmin.id
        }
      });
    }
    if (balance.iqd > 0) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'deposit',
          amount: balance.iqd,
          currency: 'IQD',
          description: 'Initial deposit in local currency',
          descriptionAr: 'إيداع رصيد ابتدائي بالعملة المحلية للعمليات الطارئة',
          referenceType: 'manual',
          performedBy: superAdmin.id
        }
      });
    }
  }
  console.log('✅ Wallets and initial transactions created.');

  // 8. Create Customers (10 customers, some with user accounts)
  const customerNames = [
    { en: 'Karrar Jafar', ar: 'كرار جعفر الموسوي', city: 'Baghdad', cityAr: 'بغداد' },
    { en: 'Ali Hassan', ar: 'علي حسن الفتلاوي', city: 'Baghdad', cityAr: 'بغداد' },
    { en: 'Zaid Saad', ar: 'زيد سعد المحمداوي', city: 'Basra', cityAr: 'البصرة' },
    { en: 'Murtadha Alwan', ar: 'مرتضى علوان الجابري', city: 'Basra', cityAr: 'البصرة' },
    { en: 'Hassan Karim', ar: 'حسن كريم الزبيدي', city: 'Najaf', cityAr: 'النجف' },
    { en: 'Mustafa Nuri', ar: 'مصطفى نوري الدليمي', city: 'Erbil', cityAr: 'أربيل' },
    { en: 'Yaser Fadhil', ar: 'ياسر فاضل الجبوري', city: 'Hilla', cityAr: 'الحلة' },
    { en: 'Jafar Sadiq', ar: 'جعفر صادق العبيدي', city: 'Karbala', cityAr: 'كربلاء' },
    { en: 'Hussein Ali', ar: 'حسين علي البياتي', city: 'Kirkuk', cityAr: 'كركوك' },
    { en: 'Falah Hassan', ar: 'فلاح حسن الشمري', city: 'Amarah', cityAr: 'العمارة' }
  ];

  const createdCustomers: any[] = [];
  for (let i = 0; i < customerNames.length; i++) {
    const custData = customerNames[i];
    // Create a User login account for customer1
    let linkedUserId: string | null = null;
    if (i === 0) {
      const custUser = await prisma.user.create({
        data: {
          username: 'customer1',
          email: 'customer1@albasha.local',
          passwordHash: customerHash,
          fullName: custData.en,
          fullNameAr: custData.ar,
          roleId: createdRoles['customer'].id,
          status: 'active'
        }
      });
      linkedUserId = custUser.id;
    }

    const assignedAgent = agents[i % agents.length]; // cycle agents

    const customer = await prisma.customer.create({
      data: {
        userId: linkedUserId,
        agentId: assignedAgent.id,
        fullName: custData.en,
        fullNameAr: custData.ar,
        phone: `+964770${Math.floor(1000000 + Math.random() * 9000000)}`,
        email: `${custData.en.toLowerCase().replace(' ', '')}@gmail.com`,
        city: custData.city,
        cityAr: custData.cityAr,
        preferredCommunication: 'whatsapp',
        createdBy: assignedAgent.id
      }
    });
    createdCustomers.push(customer);
  }
  console.log('✅ Customers created.');

  // 9. Create Vehicles (20 vehicles across 16 stages)
  // List of stages to populate
  const vehiclePipelines = [
    { vin: '1FA6P8CF0H5100001', make: 'Ford', model: 'Mustang', year: 2017, color: 'Red', colorAr: 'أحمر', stage: VehicleStage.AUCTION_PURCHASED, track: UserTrackingStage.PURCHASED, price: 1250000, fees: 85000 },
    { vin: '1FA6P8CF0H5100002', make: 'Chevrolet', model: 'Camaro', year: 2018, color: 'Black', colorAr: 'أسود', stage: VehicleStage.AUCTION_PURCHASED, track: UserTrackingStage.PURCHASED, price: 1420000, fees: 90000 },
    { vin: '1FA6P8CF0H5100003', make: 'Dodge', model: 'Charger', year: 2019, color: 'White', colorAr: 'أبيض', stage: VehicleStage.AUCTION_PURCHASED, track: UserTrackingStage.PURCHASED, price: 1850000, fees: 95000 },
    
    { vin: '2C3CDZAG3KH200004', make: 'Toyota', model: 'Camry', year: 2020, color: 'Silver', colorAr: 'فضي', stage: VehicleStage.CARRIER_PICKUP, track: UserTrackingStage.PICKUP, price: 1120000, fees: 75000 },
    { vin: '2C3CDZAG3KH200005', make: 'Honda', model: 'Accord', year: 2021, color: 'Blue', colorAr: 'أزرق', stage: VehicleStage.CARRIER_PICKUP, track: UserTrackingStage.PICKUP, price: 1350000, fees: 80000 },
    
    { vin: '3FA6P0HR8HR300006', make: 'Jeep', model: 'Grand Cherokee', year: 2016, color: 'Gray', colorAr: 'رمادي', stage: VehicleStage.WAREHOUSE_ARRIVAL, track: UserTrackingStage.WAREHOUSE, price: 950000, fees: 65000 },
    { vin: '3FA6P0HR8HR300007', make: 'Ford', model: 'Explorer', year: 2018, color: 'Black', colorAr: 'أسود', stage: VehicleStage.INITIAL_INSPECTION, track: UserTrackingStage.WAREHOUSE, price: 1550000, fees: 90000 },
    { vin: '3FA6P0HR8HR300008', make: 'Nissan', model: 'Rogue', year: 2019, color: 'White', colorAr: 'أبيض', stage: VehicleStage.WAREHOUSE_ARRIVAL, track: UserTrackingStage.WAREHOUSE, price: 820000, fees: 60000 },
    
    { vin: '4T1BF1FK8JU400009', make: 'Kia', model: 'Optima', year: 2018, color: 'Blue', colorAr: 'أزرق', stage: VehicleStage.EXPORT_PREPARATION, track: UserTrackingStage.WAREHOUSE, price: 780000, fees: 55000 },
    { vin: '4T1BF1FK8JU400010', make: 'Hyundai', model: 'Elantra', year: 2019, color: 'Red', colorAr: 'أحمر', stage: VehicleStage.EXPORT_PREPARATION, track: UserTrackingStage.WAREHOUSE, price: 620000, fees: 50000 },
    
    { vin: '5N1AL0MM3JC500011', make: 'BMW', model: '530i', year: 2018, color: 'White', colorAr: 'أبيض', stage: VehicleStage.OCEAN_SHIPPING, track: UserTrackingStage.SHIPPING, price: 2150000, fees: 110000 },
    { vin: '5N1AL0MM3JC500012', make: 'Mercedes', model: 'C300', year: 2017, color: 'Black', colorAr: 'أسود', stage: VehicleStage.OCEAN_SHIPPING, track: UserTrackingStage.SHIPPING, price: 1980000, fees: 105000 },
    
    { vin: 'SALWR2VF5HA600013', make: 'Land Rover', model: 'Range Rover', year: 2019, color: 'Gray', colorAr: 'رمادي', stage: VehicleStage.IRAQ_PORT_ARRIVAL, track: UserTrackingStage.IRAQ_ARRIVAL, price: 4200000, fees: 150000 },
    { vin: 'SALWR2VF5HA600014', make: 'Lexus', model: 'RX350', year: 2020, color: 'White', colorAr: 'أبيض', stage: VehicleStage.IRAQ_PORT_ARRIVAL, track: UserTrackingStage.IRAQ_ARRIVAL, price: 3400000, fees: 130000 },
    
    { vin: 'JTMDF4RF7H5700015', make: 'Toyota', model: 'RAV4', year: 2019, color: 'Silver', colorAr: 'فضي', stage: VehicleStage.CUSTOMS_CLEARANCE, track: UserTrackingStage.CUSTOMS, price: 1650000, fees: 85000 },
    { vin: 'JTMDF4RF7H5700016', make: 'Honda', model: 'CR-V', year: 2018, color: 'Brown', colorAr: 'بني', stage: VehicleStage.CUSTOMS_CLEARANCE, track: UserTrackingStage.CUSTOMS, price: 1280000, fees: 75000 },
    
    { vin: '5YJ3E1EA5KF800017', make: 'Tesla', model: 'Model 3', year: 2020, color: 'Blue', colorAr: 'أزرق', stage: VehicleStage.FINAL_DELIVERY, track: UserTrackingStage.DELIVERED, price: 2200000, fees: 110000 },
    { vin: '5YJ3E1EA5KF800018', make: 'Audi', model: 'A6', year: 2019, color: 'Black', colorAr: 'أسود', stage: VehicleStage.FINAL_DELIVERY, track: UserTrackingStage.DELIVERED, price: 2450000, fees: 115000 },
    
    { vin: '1G11Y5S3XHF900019', make: 'Chevrolet', model: 'Malibu', year: 2017, color: 'White', colorAr: 'أبيض', stage: VehicleStage.POST_DELIVERY_ARCHIVE, track: UserTrackingStage.DELIVERED, price: 850000, fees: 60000, status: 'delivered' },
    { vin: '1G11Y5S3XHF900020', make: 'Ford', model: 'Fusion', year: 2016, color: 'Red', colorAr: 'أحمر', stage: VehicleStage.POST_DELIVERY_ARCHIVE, track: UserTrackingStage.DELIVERED, price: 720000, fees: 50000, status: 'delivered' }
  ];

  for (let i = 0; i < vehiclePipelines.length; i++) {
    const v = vehiclePipelines[i];
    const customer = createdCustomers[i % createdCustomers.length];
    const agent = agents[i % agents.length];
    const branch = createdBranches[i % createdBranches.length];

    const shippingFeesUsd = 120000; // $1,200.00
    const otherFeesUsd = 40000;      // $400.00
    const totalCostUsd = (v.price || 0) + (v.fees || 0) + shippingFeesUsd + otherFeesUsd;
    
    // Convert to IQD fils (exchange rate approx 150,000 IQD per 100 USD -> 1 USD = 1500 fils)
    const purchaseIqd = v.price ? v.price * 15 : null;
    const shippingIqd = shippingFeesUsd * 15;
    const otherIqd = otherFeesUsd * 15;
    const totalCostIqd = (purchaseIqd || 0) + shippingIqd + otherIqd;

    const vehicle = await prisma.vehicle.create({
      data: {
        vin: v.vin,
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color,
        colorAr: v.colorAr,
        lotNumber: `LOT-${Math.floor(10000000 + Math.random() * 90000000)}`,
        auctionSource: i % 2 === 0 ? 'copart' : 'iaai',
        purchasePriceUsd: v.price,
        purchasePriceIqd: purchaseIqd,
        auctionFeesUsd: v.fees,
        shippingFeesUsd,
        shippingFeesIqd: shippingIqd,
        otherFeesUsd,
        otherFeesIqd: otherIqd,
        totalCostUsd,
        totalCostIqd,
        currentStage: v.stage,
        userTrackingStage: v.track,
        agentId: agent.id,
        customerId: customer.id,
        branchId: branch.id,
        status: (v as any).status || 'active',
        notes: `Sample vehicle in stage ${v.stage}`,
        notesAr: `مركبة افتراضية تم إنشاؤها للاختبار في مرحلة: ${v.stage}`,
        createdBy: agent.id
      }
    });

    // Create stage transition entry for initial stage
    await prisma.vehicleStageTransition.create({
      data: {
        vehicleId: vehicle.id,
        fromStage: null,
        toStage: v.stage,
        transitionedBy: agent.id,
        notes: 'Initial vehicle registration',
        notesAr: 'تم تسجيل السيارة وبداية مسار الشحن في النظام.'
      }
    });

    // For vehicles that are advanced, add an additional stage history for realism
    if (v.stage !== VehicleStage.AUCTION_PURCHASED) {
      await prisma.vehicleStageTransition.create({
        data: {
          vehicleId: vehicle.id,
          fromStage: VehicleStage.AUCTION_PURCHASED,
          toStage: v.stage,
          transitionedBy: agent.id,
          notes: 'Advanced to current stage',
          notesAr: `تم تحديث الشحنة والوصول إلى مرحلة: ${v.stage}`
        }
      });
    }

    // Add some sample photo attachments that are customer visible
    await prisma.vehicleAttachment.create({
      data: {
        vehicleId: vehicle.id,
        stage: v.stage,
        attachmentType: 'photo',
        documentCategory: 'vehicle_photo',
        fileUrl: `uploads/${vehicle.id}/photos/car_sample_${i + 1}.jpg`,
        fileName: `car_sample_${i + 1}.jpg`,
        fileSize: 450 * 1024,
        mimeType: 'image/jpeg',
        isCustomerVisible: true,
        uploadedBy: agent.id,
        notes: 'External inspection photo'
      }
    });

    // Add private purchase receipt
    await prisma.vehicleAttachment.create({
      data: {
        vehicleId: vehicle.id,
        stage: VehicleStage.AUCTION_PURCHASED,
        attachmentType: 'document',
        documentCategory: 'purchase_receipt',
        fileUrl: `uploads/${vehicle.id}/docs/auction_invoice_${i + 1}.pdf`,
        fileName: `auction_invoice_${i + 1}.pdf`,
        fileSize: 1200 * 1024,
        mimeType: 'application/pdf',
        isCustomerVisible: false,
        uploadedBy: agent.id,
        notes: 'Internal invoice invoice file'
      }
    });
  }
  console.log('✅ Vehicles and attachments created.');

  // 10. Create Sample Receipts from Agents
  for (let i = 0; i < agents.length - 1; i++) {
    const agentObj = agents[i];
    const wallet = createdWallets[agentObj.id];

    await prisma.receipt.create({
      data: {
        walletId: wallet.id,
        agentId: agentObj.id,
        amount: 250000, // $2,500.00
        currency: 'USD',
        receiptImageUrl: `uploads/receipts/receipt_${agentObj.username}_1.jpg`,
        fileName: `receipt_${agentObj.username}_1.jpg`,
        status: i === 0 ? 'reviewed' : 'pending',
        reviewedBy: i === 0 ? superAdmin.id : null,
        reviewedAt: i === 0 ? new Date() : null,
        adminNotes: i === 0 ? 'Approved deposit of $2500' : null
      }
    });
  }
  console.log('✅ Receipts created.');

  // 11. Create Notifications
  // Notify customer1 about stage change
  const linkedCust = createdCustomers[0];
  if (linkedCust.userId) {
    await prisma.notification.create({
      data: {
        userId: linkedCust.userId,
        type: 'stage_transition',
        titleAr: 'تحديث شحن سيارتك',
        bodyAr: 'تم ترفيع شحنة سيارتك Ford Mustang إلى مرحلة الشراء والتجهيز.',
        referenceType: 'vehicle',
        referenceId: (await prisma.vehicle.findFirst({ where: { customerId: linkedCust.id } }))?.id,
        isRead: false
      }
    });
  }

  // Notify agent1 about balance adjustment
  await prisma.notification.create({
    data: {
      userId: agent1.id,
      type: 'wallet_update',
      titleAr: 'تعديل في المحفظة المالية',
      bodyAr: 'تم إيداع رصيد ابتدائي بقيمة 15,500$ في محفظتك المعتمدة.',
      referenceType: 'wallet',
      referenceId: createdWallets[agent1.id].id,
      isRead: false
    }
  });
  console.log('✅ Notifications created.');

  // 12. Create Audit Log entries
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: 'create',
      entityType: 'user',
      entityId: agent1.id,
      newValue: { fullName: agent1.fullName, role: 'senior_agent' },
      ipAddress: '127.0.0.1',
      userAgent: 'System Seed Generator'
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: agent1.id,
      action: 'create',
      entityType: 'vehicle',
      entityId: (await prisma.vehicle.findFirst({ where: { agentId: agent1.id } }))!.id,
      newValue: { vin: '1FA6P8CF0H5100001' },
      ipAddress: '127.0.0.1',
      userAgent: 'System Seed Generator'
    }
  });
  console.log('✅ Audit Log records created.');

  console.log('🎉 Database seeding completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
