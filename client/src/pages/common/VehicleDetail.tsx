import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '../../utils/permissions';
import { formatDate } from '../../utils/formatDate';
import { formatUSD, formatIQD } from '../../utils/formatCurrency';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  color_ar: string | null;
  lot_number: string | null;
  auction_source: 'copart' | 'iaai' | 'other' | null;
  purchase_price_usd: number | null;
  purchase_price_iqd: number | null;
  auction_fees_usd: number | null;
  shipping_fees_usd: number | null;
  shipping_fees_iqd: number | null;
  other_fees_usd: number | null;
  other_fees_iqd: number | null;
  total_cost_usd: number;
  total_cost_iqd: number;
  current_stage: string;
  user_tracking_stage: string;
  agent_id: string;
  customer_id: string | null;
  branch_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  closed_by_user: { id: string; full_name: string; full_name_ar: string } | null;
  agent: { id: string; full_name: string; full_name_ar: string } | null;
  customer: { id: string; full_name: string; full_name_ar: string } | null;
  branch: { id: string; name: string; name_ar: string } | null;
}

interface StageTransition {
  id: string;
  from_stage: string | null;
  to_stage: string;
  note: string | null;
  created_at: string;
  transitioned_by: {
    id: string;
    full_name: string;
    full_name_ar: string;
  } | null;
}

// ─── Stage Sequence ───────────────────────────────────────────────────────────

const STAGE_SEQUENCE = [
  'AUCTION_PURCHASED', 'VEHICLE_RELEASED', 'CARRIER_PICKUP', 'INLAND_TRANSPORT',
  'WAREHOUSE_ARRIVAL', 'INITIAL_INSPECTION', 'EXPORT_PREPARATION', 'TITLE_PROCESSING',
  'PORT_DELIVERY_ORIGIN', 'PORT_TERMINAL_HANDLING', 'OCEAN_SHIPPING', 'IRAQ_PORT_ARRIVAL',
  'CUSTOMS_CLEARANCE', 'LOCAL_TRANSPORT', 'FINAL_DELIVERY', 'POST_DELIVERY_ARCHIVE'
];

// ─── Stage Label Lookup ───────────────────────────────────────────────────────

function getStageLabel(stage: string | null): string {
  if (!stage) return ar.stageTransition.initialStage;
  return (ar.stages16 as Record<string, string>)[stage] || stage;
}

function getUserTrackingLabel(stage: string): string {
  return (ar.stages8 as Record<string, string>)[stage] || stage;
}

function getNextStage(currentStage: string): string | null {
  const idx = STAGE_SEQUENCE.indexOf(currentStage);
  if (idx === -1 || idx === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[idx + 1];
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'vehicles', 'read');
  const canWrite = hasPermission(currentUser, 'vehicles', 'write');

  // Check if user is super_admin (can skip sequence)
  const isSuperAdmin = currentUser?.role?.name === 'super_admin' || (currentUser?.role?.level ?? 99) === 1;

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Stage history
  const [transitions, setTransitions] = useState<StageTransition[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Stage transition form
  const [showTransitionForm, setShowTransitionForm] = useState(false);
  const [formToStage, setFormToStage] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scoping helpers
  const isSuperOrOps =
    currentUser?.role?.name === 'super_admin' ||
    currentUser?.role?.name === 'operations_manager' ||
    (currentUser?.role?.level ?? 99) <= 2;

  const isBranchManager =
    currentUser?.role?.name === 'branch_manager' ||
    (currentUser?.role?.level ?? 99) === 3;

  const hasAccessToClosure = vehicle
    ? (isSuperOrOps || (isBranchManager && vehicle.branch_id === currentUser?.branchId))
    : false;

  // Closure readiness and approvals state
  const [readiness, setReadiness] = useState<any>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  // Approval form state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedApprovalType, setSelectedApprovalType] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Final closure state
  const [showConfirmClosure, setShowConfirmClosure] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);
  const [closureSuccessMsg, setClosureSuccessMsg] = useState<string | null>(null);
  const [closureErrorMsg, setClosureErrorMsg] = useState<string | null>(null);

  const fetchReadiness = useCallback(async () => {
    if (!id || !canRead || !hasAccessToClosure) return;
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const response = await api.get(`/closures/${id}/readiness`);
      setReadiness(response.data.data);
    } catch (err: any) {
      setReadinessError(err.messageAr || ar.common.error);
    } finally {
      setReadinessLoading(false);
    }
  }, [id, canRead, hasAccessToClosure]);

  // Handle registration of a new approval
  const handleApprovalSubmit = async () => {
    if (!vehicle || !selectedApprovalType) return;
    if (approvalNote.length > 500) {
      setApprovalError(ar.closures.errorNoteTooLong);
      return;
    }

    setApprovalSubmitting(true);
    setApprovalError(null);
    try {
      await api.post(`/closures/${vehicle.id}/approvals`, {
        approval_type: selectedApprovalType,
        note: approvalNote || null,
      });
      setShowApprovalModal(false);
      await fetchVehicle();
      await fetchReadiness();
      setClosureSuccessMsg(ar.closures.successApproval);
    } catch (err: any) {
      setApprovalError(err.messageAr || ar.common.error);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Handle final closure execution
  const handleExecuteClosure = async () => {
    if (!vehicle) return;
    setClosureSubmitting(true);
    setClosureErrorMsg(null);
    setClosureSuccessMsg(null);
    try {
      await api.post(`/closures/${vehicle.id}/execute`);
      setClosureSuccessMsg(ar.closures.successClosure);
      setShowConfirmClosure(false);
      await fetchVehicle();
      await fetchReadiness();
      await fetchHistory();
    } catch (err: any) {
      setClosureErrorMsg(err.messageAr || ar.common.error);
      setShowConfirmClosure(false);
    } finally {
      setClosureSubmitting(false);
    }
  };

  // Compute allowed approval types based on role mapping
  const allowedApprovalTypes: { value: string; label: string }[] = [];
  if (currentUser?.role?.name === 'super_admin' || (currentUser?.role?.level ?? 99) === 1) {
    allowedApprovalTypes.push({ value: 'finance', label: ar.closures.approvalTypeFinance });
    allowedApprovalTypes.push({ value: 'operations', label: ar.closures.approvalTypeOperations });
    allowedApprovalTypes.push({ value: 'administration', label: ar.closures.approvalTypeAdministration });
  } else if (currentUser?.role?.name === 'operations_manager' || (currentUser?.role?.level ?? 99) === 2) {
    allowedApprovalTypes.push({ value: 'finance', label: ar.closures.approvalTypeFinance });
    allowedApprovalTypes.push({ value: 'operations', label: ar.closures.approvalTypeOperations });
  } else if (currentUser?.role?.name === 'branch_manager' || (currentUser?.role?.level ?? 99) === 3) {
    allowedApprovalTypes.push({ value: 'operations', label: ar.closures.approvalTypeOperations });
  }

  const openApprovalModal = () => {
    if (allowedApprovalTypes.length > 0) {
      setSelectedApprovalType(allowedApprovalTypes[0].value);
    } else {
      setSelectedApprovalType('');
    }
    setApprovalNote('');
    setApprovalError(null);
    setShowApprovalModal(true);
  };

  const fetchVehicle = useCallback(async () => {
    if (!id || !canRead) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/vehicles/${id}`);
      setVehicle(response.data.data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل تفاصيل المركبة.');
    } finally {
      setIsLoading(false);
    }
  }, [id, canRead]);

  const fetchHistory = useCallback(async () => {
    if (!id || !canRead) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await api.get(`/vehicles/${id}/stages`);
      setTransitions(response.data.data);
    } catch (err: any) {
      setHistoryError(err.messageAr || ar.stageTransition.historyError);
    } finally {
      setHistoryLoading(false);
    }
  }, [id, canRead]);

  useEffect(() => {
    fetchVehicle();
    fetchHistory();
  }, [fetchVehicle, fetchHistory]);

  useEffect(() => {
    if (vehicle && hasAccessToClosure) {
      fetchReadiness();
    }
  }, [vehicle, hasAccessToClosure, fetchReadiness]);

  const openTransitionForm = () => {
    if (!vehicle) return;
    if (isSuperAdmin) {
      // Super admin sees all stages except current
      const availableStages = STAGE_SEQUENCE.filter(s => s !== vehicle.current_stage);
      setFormToStage(availableStages[0] || '');
    } else {
      const next = getNextStage(vehicle.current_stage);
      setFormToStage(next || '');
    }
    setFormNote('');
    setFormError(null);
    setFormSuccess(null);
    setShowTransitionForm(true);
  };

  const handleTransitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || !formToStage) return;

    if (formNote.length > 500) {
      setFormError(ar.stageTransition.noteTooLong);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await api.post(`/vehicles/${vehicle.id}/stage`, {
        to_stage: formToStage,
        note: formNote || null
      });
      setFormSuccess(ar.stageTransition.successMsg);
      setShowTransitionForm(false);
      // Refresh vehicle and history
      await fetchVehicle();
      await fetchHistory();
    } catch (err: any) {
      setFormError(err.messageAr || ar.stageTransition.errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Guards ────────────────────────────────────────────────────────────────

  if (!canRead) {
    return (
      <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error font-bold">
        ⚠️ {ar.common.unauthorized}
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner label="جاري تحميل تفاصيل المركبة..." />;
  }

  if (errorMsg || !vehicle) {
    return (
      <div className="flex flex-col gap-4 text-right">
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-xs text-error font-semibold">
          ⚠️ {errorMsg || 'المركبة المطلوبة غير موجودة في النظام.'}
        </div>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => navigate(-1)}>
          {ar.common.back}
        </Button>
      </div>
    );
  }

  // Compute available stages for the dropdown
  const availableStages = isSuperAdmin
    ? STAGE_SEQUENCE.filter(s => s !== vehicle.current_stage)
    : [getNextStage(vehicle.current_stage)].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-6 text-right select-none">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-primary-dark">
              {vehicle.make ? `${vehicle.make} ${vehicle.model || ''} (${vehicle.year || ''})` : 'بيانات المركبة'}
            </h1>
            <Badge variant={vehicle.status === 'active' ? 'success' : 'gray'}>
              {(ar.status as any)[vehicle.status] || vehicle.status}
            </Badge>
          </div>
          <span className="text-xs font-mono font-bold text-text-secondary">VIN: {vehicle.vin}</span>
        </div>

        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          {ar.common.back}
        </Button>
      </div>

      {/* Success notification */}
      {formSuccess && (
        <div className="bg-success/10 border border-success/20 p-3 rounded-lg text-xs text-success font-semibold text-right">
          ✅ {formSuccess}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Card 1: Specifications */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-2">المواصفات الأساسية</h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">الماركة</span>
                <span className="text-xs font-bold text-primary-dark">{vehicle.make || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">الموديل</span>
                <span className="text-xs font-bold text-primary-dark">{vehicle.model || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">سنة الصنع</span>
                <span className="text-xs font-bold text-primary-dark">{vehicle.year || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">اللون بالعربية</span>
                <span className="text-xs font-bold text-primary-dark">{vehicle.color_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">اللون بالإنجليزية</span>
                <span className="text-xs font-mono text-text-secondary">{vehicle.color || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">تاريخ التسجيل</span>
                <span className="text-xs text-text-secondary">{formatDate(vehicle.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Financial Details */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-2">الرسوم والتكاليف المالية</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-border pb-4 bg-bg-light/35 p-4 rounded-lg">
              <div className="text-center flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">إجمالي التكلفة بالدولار</span>
                <span className="text-lg font-bold font-mono text-success">{formatUSD(vehicle.total_cost_usd)}</span>
              </div>
              <div className="text-center flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">إجمالي التكلفة بالدينار</span>
                <span className="text-lg font-bold font-mono text-success">{formatIQD(vehicle.total_cost_iqd)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">سعر الشراء ($)</span>
                <span className="font-mono">{formatUSD(vehicle.purchase_price_usd)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">سعر الشراء (د.ع)</span>
                <span className="font-mono">{formatIQD(vehicle.purchase_price_iqd)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">رسوم المزاد ($)</span>
                <span className="font-mono">{formatUSD(vehicle.auction_fees_usd)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">أجور الشحن ($)</span>
                <span className="font-mono">{formatUSD(vehicle.shipping_fees_usd)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">أجور الشحن (د.ع)</span>
                <span className="font-mono">{formatIQD(vehicle.shipping_fees_iqd)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">رسوم أخرى ($)</span>
                <span className="font-mono">{formatUSD(vehicle.other_fees_usd)}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Notes */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-2">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-1">ملاحظات الملف</h2>
            <p className="text-xs text-text-secondary bg-bg-light/20 p-3 rounded border border-border/40 min-h-[60px]">
              {vehicle.notes || 'لا توجد ملاحظات مسجلة لهذه السيارة.'}
            </p>
          </div>

          {/* Card 4: Stage History / Timeline */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
              {ar.stageTransition.historyTitle}
            </h2>

            {historyLoading ? (
              <p className="text-xs text-text-secondary text-center py-4">{ar.stageTransition.historyLoading}</p>
            ) : historyError ? (
              <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error">⚠️ {historyError}</div>
            ) : transitions.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-secondary bg-bg-light/20 rounded border border-dashed border-border">
                {ar.stageTransition.historyEmpty}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {transitions.map((t, idx) => (
                  <div key={t.id} className="relative flex gap-3">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-primary-accent border-2 border-white shadow mt-0.5 flex-shrink-0" />
                      {idx < transitions.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>
                    {/* Entry content */}
                    <div className="flex-1 bg-bg-light/30 border border-border/60 rounded-lg p-3 mb-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-bold text-primary-dark">
                          {t.from_stage ? getStageLabel(t.from_stage) : ar.stageTransition.initialStage}
                        </span>
                        <span className="text-text-secondary">←</span>
                        <span className="font-bold text-primary-accent">{getStageLabel(t.to_stage)}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-[10px] text-text-secondary">
                        <span>
                          <span className="font-bold">{ar.stageTransition.responsibleUser}:</span>{' '}
                          {t.transitioned_by?.full_name_ar || t.transitioned_by?.full_name || '-'}
                        </span>
                        <span>{formatDate(t.created_at)}</span>
                      </div>
                      {t.note && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/40 text-[10px] text-text-secondary">
                          <span className="font-bold">{ar.stageTransition.noteField}:</span>{' '}
                          {t.note}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Logistics / Stage control */}
        <div className="flex flex-col gap-6">
          {/* Card 5: Current Stage */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-1">
              مراحل الشحن والتتبع
            </h2>

            {/* Current 16-stage */}
            <div className="bg-primary-dark/5 border border-primary-dark/10 rounded-lg p-4 flex flex-col gap-2">
              <span className="text-[10px] text-text-secondary font-bold">{ar.stageTransition.currentStageLabel}</span>
              <span className="text-sm font-bold text-primary-dark">{getStageLabel(vehicle.current_stage)}</span>
              <span className="text-[10px] font-mono text-text-secondary">{vehicle.current_stage}</span>
            </div>

            {/* Customer-facing 8-stage */}
            <div className="bg-primary-accent/5 border border-primary-accent/10 rounded-lg p-3 flex flex-col gap-1">
              <span className="text-[10px] text-text-secondary font-bold">{ar.stageTransition.userTrackingStageLabel}</span>
              <span className="text-sm font-bold text-primary-accent">{getUserTrackingLabel(vehicle.user_tracking_stage)}</span>
            </div>

            {/* Stage transition button — only for write permission users, not agents */}
            {canWrite && (
              <>
                {!showTransitionForm ? (
                  <button
                    id="change-stage-btn"
                    onClick={openTransitionForm}
                    className="w-full py-2 text-xs font-bold bg-primary-accent text-white rounded-lg hover:bg-primary-accent/90 transition-all disabled:opacity-50"
                    disabled={vehicle.current_stage === 'POST_DELIVERY_ARCHIVE'}
                  >
                    {ar.stageTransition.changeStageBtn}
                  </button>
                ) : (
                  <form onSubmit={handleTransitionSubmit} className="flex flex-col gap-3 border-t border-border pt-3">
                    {formError && (
                      <div className="bg-error/10 border border-error/20 p-2.5 rounded text-[11px] text-error font-semibold">
                        ⚠️ {formError}
                      </div>
                    )}

                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-xs font-bold text-text-primary">{ar.stageTransition.newStageLabel}</label>
                      {availableStages.length === 0 ? (
                        <p className="text-[11px] text-text-secondary">لا توجد مراحل إضافية متاحة.</p>
                      ) : (
                        <select
                          id="stage-select"
                          value={formToStage}
                          onChange={e => setFormToStage(e.target.value)}
                          className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
                          required
                        >
                          {availableStages.map(s => (
                            <option key={s} value={s}>{getStageLabel(s)}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-xs font-bold text-text-primary">{ar.stageTransition.noteLabel}</label>
                      <textarea
                        id="stage-note"
                        value={formNote}
                        onChange={e => setFormNote(e.target.value)}
                        placeholder={ar.stageTransition.notePlaceholder}
                        maxLength={500}
                        rows={3}
                        className="w-full border border-border rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent resize-none"
                      />
                      <span className="text-[10px] text-text-secondary text-left">{formNote.length}/500</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        variant="secondary"
                        size="sm"
                        isLoading={isSubmitting}
                        className="flex-1 text-xs"
                      >
                        {ar.stageTransition.submitBtn}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowTransitionForm(false); setFormError(null); }}
                        disabled={isSubmitting}
                        className="flex-1 text-xs"
                      >
                        {ar.stageTransition.cancelBtn}
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Card 6: Logistics info */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-2">المسؤوليات واللوجستيات</h2>
            
            <div className="flex flex-col gap-3 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-secondary">الوكيل المسؤول</span>
                <span className="font-bold text-primary-dark">{vehicle.agent?.full_name_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
                <span className="text-[10px] text-text-secondary">العميل المالك</span>
                <span className="font-bold text-primary-dark">{vehicle.customer?.full_name_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
                <span className="text-[10px] text-text-secondary">الفرع الجغرافي</span>
                <span className="font-bold text-primary-dark">{vehicle.branch?.name_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
                <span className="text-[10px] text-text-secondary">رقم الحصة في المزاد (Lot)</span>
                <span className="font-mono text-primary-dark">{vehicle.lot_number || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-border/60 pt-2">
                <span className="text-[10px] text-text-secondary">مصدر المزاد</span>
                <span className="font-bold text-primary-accent uppercase">{vehicle.auction_source || '-'}</span>
              </div>
            </div>
          </div>

          {/* Card 7: Attachments placeholder */}
          <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-3">
            <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-1">مرفقات وصور المركبة</h2>
            <div className="text-center py-8 text-xs text-text-secondary bg-bg-light/20 rounded border border-dashed border-border flex flex-col gap-1">
              <span className="text-sm">📁 قريباً في المرحلة القادمة</span>
              <span className="text-[10px]">أرشيف ملفات صور الفحص المبدئي، تايتل السيارة، وفواتير الرسوم سيكون متاحاً للرفع والتحميل.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Closure Section */}
      {hasAccessToClosure && (
        <div className="bg-white p-6 rounded-lg border border-border shadow-sm flex flex-col gap-6 mt-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-primary-dark">
                {ar.closures.sectionTitle}
              </h2>
              {vehicle.is_closed ? (
                <Badge variant="gray">
                  {ar.closures.closedStatus}
                </Badge>
              ) : readiness?.is_ready ? (
                <Badge variant="success">
                  {ar.closures.readyStatus}
                </Badge>
              ) : (
                <Badge variant="danger">
                  {ar.closures.notReadyStatus}
                </Badge>
              )}
            </div>

            {!vehicle.is_closed && allowedApprovalTypes.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={openApprovalModal}
                className="text-xs"
              >
                ➕ {ar.closures.addApprovalBtn}
              </Button>
            )}
          </div>

          {/* Success / Error Messages inside closure section */}
          {closureSuccessMsg && (
            <div className="bg-success/10 border border-success/20 p-3 rounded-lg text-xs text-success font-semibold animate-none">
              ✅ {closureSuccessMsg}
            </div>
          )}
          {closureErrorMsg && (
            <div className="bg-error/10 border border-error/20 p-3 rounded-lg text-xs text-error font-semibold animate-none">
              ⚠️ {closureErrorMsg}
            </div>
          )}

          {/* If already closed */}
          {vehicle.is_closed && (
            <div className="bg-gray-50 border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-gray-700">🔒 {ar.closures.closedStatus}</span>
                <span className="text-text-secondary">
                  {ar.closures.closedBy}:{' '}
                  <span className="font-semibold text-text-primary">
                    {vehicle.closed_by_user?.full_name_ar || vehicle.closed_by_user?.full_name || '-'}
                  </span>
                </span>
              </div>
              <div className="text-text-secondary">
                {ar.closures.closedAt}:{' '}
                <span className="font-mono text-text-primary">
                  {vehicle.closed_at ? formatDate(vehicle.closed_at) : '-'}
                </span>
              </div>
            </div>
          )}

          {/* Readiness Loading / Error */}
          {readinessLoading ? (
            <LoadingSpinner label={ar.common.loading} />
          ) : readinessError ? (
            <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error">
              ⚠️ {readinessError}
            </div>
          ) : (
            !vehicle.is_closed && readiness && (
              <>
                {/* Missing Requirements List */}
                {!readiness.is_ready && readiness.missing_requirements.length > 0 && (
                  <div className="bg-warning/10 border border-warning/20 p-4 rounded-lg flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-warning-dark flex items-center gap-1.5">
                      ⚠️ {ar.closures.missingRequirementsTitle}
                    </h3>
                    <ul className="list-disc list-inside text-xs text-text-primary flex flex-col gap-1 pr-2">
                      {readiness.missing_requirements.map((req: string, idx: number) => (
                        <li key={idx} className="list-item">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Internal Approvals Checklist */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
                    {ar.closures.internalApprovalsTitle}
                  </h3>

                  {readiness.existing_approvals && readiness.existing_approvals.length > 0 ? (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-bg-light border-b border-border">
                          <tr>
                            <th className="px-4 py-2.5 font-bold text-text-primary">
                              {ar.closures.approvalTypeLabel}
                            </th>
                            <th className="px-4 py-2.5 font-bold text-text-primary">
                              {ar.closures.approverLabel}
                            </th>
                            <th className="px-4 py-2.5 font-bold text-text-primary">
                              {ar.closures.dateLabel}
                            </th>
                            <th className="px-4 py-2.5 font-bold text-text-primary">
                              {ar.closures.noteLabel}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {readiness.existing_approvals.map((app: any) => (
                            <tr key={app.id} className="hover:bg-bg-light/20 animate-none">
                              <td className="px-4 py-3 font-semibold text-primary-dark">
                                {app.approval_type === 'finance'
                                  ? ar.closures.approvalTypeFinance
                                  : app.approval_type === 'operations'
                                  ? ar.closures.approvalTypeOperations
                                  : app.approval_type === 'administration'
                                  ? ar.closures.approvalTypeAdministration
                                  : app.approval_type}
                              </td>
                              <td className="px-4 py-3">
                                {app.approver?.full_name_ar || app.approver?.full_name || '-'}
                              </td>
                              <td className="px-4 py-3 font-mono text-text-secondary">
                                {formatDate(app.approved_at)}
                              </td>
                              <td
                                className="px-4 py-3 text-text-secondary max-w-[250px] truncate"
                                title={app.note || ''}
                              >
                                {app.note || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-text-secondary bg-bg-light/25 rounded border border-dashed border-border">
                      {ar.common.noData}
                    </div>
                  )}
                </div>

                {/* Final Closure Action Button for super_admin */}
                {isSuperAdmin && (
                  <div className="flex flex-col gap-2 border-t border-border pt-4 mt-2">
                    {readiness.is_ready ? (
                      <div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setShowConfirmClosure(true)}
                          className="w-full sm:w-auto text-xs font-bold gap-2"
                        >
                          🔒 {ar.closures.executeClosureBtn}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <div>
                          <Button
                            variant="danger"
                            size="sm"
                            disabled
                            className="w-full sm:w-auto text-xs font-bold gap-2 opacity-50 cursor-not-allowed"
                          >
                            🔒 {ar.closures.executeClosureBtn}
                          </Button>
                        </div>
                        <span className="text-[10px] text-error font-medium">
                          {ar.closures.disabledClosureTooltip}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}

      {/* Approval Modal */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setApprovalError(null);
          setApprovalNote('');
        }}
        title={ar.closures.addApprovalBtn}
        footer={
          <div className="flex gap-2 w-full justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowApprovalModal(false);
                setApprovalError(null);
                setApprovalNote('');
              }}
              disabled={approvalSubmitting}
            >
              {ar.closures.cancelBtn}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleApprovalSubmit}
              isLoading={approvalSubmitting}
              disabled={allowedApprovalTypes.length === 0}
            >
              {ar.closures.submitApprovalBtn}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4 text-right">
          {approvalError && (
            <div className="bg-error/10 border border-error/20 p-2.5 rounded text-xs text-error font-semibold">
              ⚠️ {approvalError}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-primary">
              {ar.closures.approvalTypeLabel}
            </label>
            <select
              value={selectedApprovalType}
              onChange={(e) => setSelectedApprovalType(e.target.value)}
              className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
              required
            >
              {allowedApprovalTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-primary">
              {ar.closures.noteLabel}
            </label>
            <textarea
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={ar.closures.notePlaceholder}
              maxLength={500}
              rows={3}
              className="w-full border border-border rounded-md p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent resize-none animate-none"
            />
            <span className="text-[10px] text-text-secondary text-left">
              {approvalNote.length}/500
            </span>
          </div>
        </div>
      </Modal>

      {/* Confirm Final Closure Dialog */}
      <ConfirmDialog
        isOpen={showConfirmClosure}
        onClose={() => setShowConfirmClosure(false)}
        onConfirm={handleExecuteClosure}
        title={ar.closures.confirmDialogTitle}
        message={ar.closures.confirmDialogText}
        confirmText={ar.closures.confirmBtn}
        cancelText={ar.closures.cancelBtn}
        isDanger={true}
        isLoading={closureSubmitting}
      />
    </div>
  );
};

export default VehicleDetail;
