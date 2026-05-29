export type UserStatus = 'active' | 'suspended' | 'deleted';
export type VehicleStage =
  | 'AUCTION_PURCHASED'
  | 'VEHICLE_RELEASED'
  | 'CARRIER_PICKUP'
  | 'INLAND_TRANSPORT'
  | 'WAREHOUSE_ARRIVAL'
  | 'INITIAL_INSPECTION'
  | 'EXPORT_PREPARATION'
  | 'TITLE_PROCESSING'
  | 'PORT_DELIVERY_ORIGIN'
  | 'PORT_TERMINAL_HANDLING'
  | 'OCEAN_SHIPPING'
  | 'IRAQ_PORT_ARRIVAL'
  | 'CUSTOMS_CLEARANCE'
  | 'LOCAL_TRANSPORT'
  | 'FINAL_DELIVERY'
  | 'POST_DELIVERY_ARCHIVE';

export type UserTrackingStage =
  | 'PURCHASED'
  | 'PICKUP'
  | 'WAREHOUSE'
  | 'PORT'
  | 'SHIPPING'
  | 'IRAQ_ARRIVAL'
  | 'CUSTOMS'
  | 'DELIVERED';

export type AuctionSource = 'copart' | 'iaai' | 'other';
export type AttachmentType = 'photo' | 'video' | 'document';
export type DocumentCategory =
  | 'vehicle_photo'
  | 'vehicle_video'
  | 'vin_photo'
  | 'purchase_receipt'
  | 'customs_document'
  | 'id_passport'
  | 'contract_invoice'
  | 'damage_report'
  | 'delivery_receipt'
  | 'color_confirmation'
  | 'other';

export type WalletStatus = 'active' | 'frozen';
export type WalletTransactionType = 'deposit' | 'deduction' | 'adjustment';
export type Currency = 'USD' | 'IQD';
export type ReceiptStatus = 'pending' | 'reviewed' | 'noted';
export type NotificationType =
  | 'stage_transition'
  | 'wallet_update'
  | 'receipt_status'
  | 'system_announcement'
  | 'vehicle_update';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'stage_transition'
  | 'wallet_operation'
  | 'status_change';

export interface User {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  passwordHash?: string; // Optional for security on client
  fullName: string;
  fullNameAr: string;
  roleId: string;
  branchId: string | null;
  parentUserId: string | null;
  status: UserStatus;
  customPermissions: Record<string, any> | null;
  geographicScope: string[] | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  
  // Relations
  role?: Role;
  branch?: Branch | null;
  parentUser?: User | null;
  children?: User[];
  managedVehicles?: Vehicle[];
  managedCustomers?: Customer[];
  createdUsers?: User[];
  wallet?: Wallet | null;
  sessions?: Session[];
}

export interface Role {
  id: string;
  name: string;
  nameAr: string;
  level: number;
  defaultPermissions: Record<string, any>;
  description: string | null;
  descriptionAr: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  users?: User[];
}

export interface Branch {
  id: string;
  name: string;
  nameAr: string;
  city: string;
  cityAr: string;
  region: string;
  regionAr: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  
  // Relations
  users?: User[];
  vehicles?: Vehicle[];
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  color: string;
  colorAr: string;
  lotNumber: string | null;
  auctionSource: AuctionSource | null;
  purchasePriceUsd: number | null;
  purchasePriceIqd: number | null;
  auctionFeesUsd: number | null;
  shippingFeesUsd: number | null;
  shippingFeesIqd: number | null;
  otherFeesUsd: number | null;
  otherFeesIqd: number | null;
  totalCostUsd: number;
  totalCostIqd: number;
  currentStage: VehicleStage;
  userTrackingStage: UserTrackingStage;
  agentId: string;
  customerId: string | null;
  branchId: string | null;
  status: 'active' | 'delivered' | 'archived' | 'cancelled';
  notes: string | null;
  notesAr: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  
  // Relations
  agent?: User;
  customer?: Customer | null;
  branch?: Branch | null;
  attachments?: VehicleAttachment[];
  stageTransitions?: VehicleStageTransition[];
}

export interface VehicleStageTransition {
  id: string;
  vehicleId: string;
  fromStage: VehicleStage | null;
  toStage: VehicleStage;
  transitionedBy: string;
  notes: string | null;
  notesAr: string | null;
  createdAt: string;
  
  // Relations
  vehicle?: Vehicle;
  user?: User;
}

export interface VehicleAttachment {
  id: string;
  vehicleId: string;
  stage: VehicleStage;
  attachmentType: AttachmentType;
  documentCategory: DocumentCategory;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isCustomerVisible: boolean;
  uploadedBy: string;
  uploadedAt: string;
  notes: string | null;
  
  // Relations
  vehicle?: Vehicle;
  uploader?: User;
}

export interface Customer {
  id: string;
  userId: string | null;
  agentId: string;
  fullName: string;
  fullNameAr: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  cityAr: string | null;
  region: string | null;
  preferredCommunication: 'phone' | 'whatsapp' | 'email' | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  
  // Relations
  user?: User | null;
  agent?: User;
  vehicles?: Vehicle[];
}

export interface Wallet {
  id: string;
  agentId: string;
  balanceUsd: number;
  balanceIqd: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  agent?: User;
  transactions?: WalletTransaction[];
  receipts?: Receipt[];
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  currency: Currency;
  description: string;
  descriptionAr: string;
  referenceType: 'manual' | 'vehicle' | 'receipt' | null;
  referenceId: string | null;
  performedBy: string;
  createdAt: string;
  
  // Relations
  wallet?: Wallet;
  performer?: User;
}

export interface Receipt {
  id: string;
  walletId: string;
  agentId: string;
  amount: number;
  currency: Currency;
  receiptImageUrl: string;
  fileName: string;
  status: ReceiptStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNotes: string | null;
  submittedAt: string;
  createdAt: string;
  
  // Relations
  wallet?: Wallet;
  agent?: User;
  reviewer?: User | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  titleAr: string;
  bodyAr: string;
  referenceType: 'vehicle' | 'wallet' | 'receipt' | 'system' | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  
  // Relations
  user?: User;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  
  // Relations
  user?: User | null;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updatedBy: string | null;
  updatedAt: string;
  
  // Relations
  updater?: User | null;
}
