import { VehicleStage, UserTrackingStage } from '@prisma/client';

// ─── Stage Sequence ───────────────────────────────────────────────────────────

export const STAGE_SEQUENCE: VehicleStage[] = [
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
  'POST_DELIVERY_ARCHIVE',
];

// ─── Mapping: Internal 16-stage → Customer-facing 8-stage ────────────────────

export const STAGE_TO_USER_TRACKING: Record<VehicleStage, UserTrackingStage> = {
  AUCTION_PURCHASED:      'PURCHASED',
  VEHICLE_RELEASED:       'PURCHASED',
  CARRIER_PICKUP:         'PICKUP',
  INLAND_TRANSPORT:       'PICKUP',
  WAREHOUSE_ARRIVAL:      'WAREHOUSE',
  INITIAL_INSPECTION:     'WAREHOUSE',
  EXPORT_PREPARATION:     'WAREHOUSE',
  TITLE_PROCESSING:       'PORT',
  PORT_DELIVERY_ORIGIN:   'PORT',
  PORT_TERMINAL_HANDLING: 'PORT',
  OCEAN_SHIPPING:         'SHIPPING',
  IRAQ_PORT_ARRIVAL:      'IRAQ_ARRIVAL',
  CUSTOMS_CLEARANCE:      'CUSTOMS',
  LOCAL_TRANSPORT:        'CUSTOMS',
  FINAL_DELIVERY:         'DELIVERED',
  POST_DELIVERY_ARCHIVE:  'DELIVERED',
};

// ─── Transition Validation ────────────────────────────────────────────────────

/**
 * Validates whether a transition from `fromStage` to `toStage` is permitted for
 * the given role. Super-admins may transition to any stage. All other roles must
 * advance exactly one step forward in the sequence.
 *
 * Returns `{ valid: true }` if the transition is allowed.
 * Returns `{ valid: false, reason: string }` if the transition is rejected.
 */
export function validateTransition(
  fromStage: VehicleStage,
  toStage: VehicleStage,
  isSuperAdmin: boolean
): { valid: true } | { valid: false; reason: string } {
  if (!STAGE_SEQUENCE.includes(toStage)) {
    return { valid: false, reason: 'INVALID_STAGE' };
  }

  if (isSuperAdmin) {
    // Super admin may transition to any stage — including same stage or backwards.
    // We still reject same-stage as a no-op.
    if (fromStage === toStage) {
      return { valid: false, reason: 'SAME_STAGE' };
    }
    return { valid: true };
  }

  // Standard users: only the immediate next stage is allowed
  const fromIndex = STAGE_SEQUENCE.indexOf(fromStage);
  const toIndex = STAGE_SEQUENCE.indexOf(toStage);

  if (fromIndex === -1) {
    return { valid: false, reason: 'INVALID_FROM_STAGE' };
  }

  if (toIndex !== fromIndex + 1) {
    return { valid: false, reason: 'SEQUENCE_VIOLATION' };
  }

  return { valid: true };
}

/**
 * Returns only the immediate next stage in the sequence, or null if the vehicle
 * is already at the final stage. Used to build the dropdown for standard users.
 */
export function getNextStage(currentStage: VehicleStage): VehicleStage | null {
  const idx = STAGE_SEQUENCE.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[idx + 1];
}
