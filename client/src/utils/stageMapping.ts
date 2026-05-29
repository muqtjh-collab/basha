import type { VehicleStage, UserTrackingStage } from '../types';
import { ar } from '../locale/ar';

export const STAGE_MAP: Record<VehicleStage, UserTrackingStage> = {
  AUCTION_PURCHASED: 'PURCHASED',
  VEHICLE_RELEASED: 'PURCHASED',
  
  CARRIER_PICKUP: 'PICKUP',
  
  INLAND_TRANSPORT: 'WAREHOUSE',
  WAREHOUSE_ARRIVAL: 'WAREHOUSE',
  INITIAL_INSPECTION: 'WAREHOUSE',
  EXPORT_PREPARATION: 'WAREHOUSE',
  
  TITLE_PROCESSING: 'PORT',
  PORT_DELIVERY_ORIGIN: 'PORT',
  
  PORT_TERMINAL_HANDLING: 'SHIPPING',
  OCEAN_SHIPPING: 'SHIPPING',
  
  IRAQ_PORT_ARRIVAL: 'IRAQ_ARRIVAL',
  
  CUSTOMS_CLEARANCE: 'CUSTOMS',
  
  LOCAL_TRANSPORT: 'DELIVERED',
  FINAL_DELIVERY: 'DELIVERED',
  POST_DELIVERY_ARCHIVE: 'DELIVERED'
};

export const get16StageLabel = (stage: VehicleStage): string => {
  return ar.stages16[stage] || stage;
};

export const get8StageLabel = (stage: UserTrackingStage): string => {
  return ar.stages8[stage] || stage;
};

// Returns ordered indexes to calculate pipeline progress percentage
export const get16StageIndex = (stage: VehicleStage): number => {
  const order: VehicleStage[] = [
    'AUCTION_PURCHASED',
    'VEHICLE_RELEASED',
    'CARRIER_PICKUP',
    'INLAND_TRANSPORT',
    'WAREHOUSE_ARRIVAL',
    'INITIAL_INSPECTION',
    'EXPORT_PREPARATION',
    'TITLE_PROCESSING',
    'PORT_DELIVERY_ORIGIN',
    'PORT_TERMINAL_HANDLING',
    'OCEAN_SHIPPING',
    'IRAQ_PORT_ARRIVAL',
    'CUSTOMS_CLEARANCE',
    'LOCAL_TRANSPORT',
    'FINAL_DELIVERY',
    'POST_DELIVERY_ARCHIVE'
  ];
  return order.indexOf(stage);
};

export const get8StageIndex = (stage: UserTrackingStage): number => {
  const order: UserTrackingStage[] = [
    'PURCHASED',
    'PICKUP',
    'WAREHOUSE',
    'PORT',
    'SHIPPING',
    'IRAQ_ARRIVAL',
    'CUSTOMS',
    'DELIVERED'
  ];
  return order.indexOf(stage);
};
