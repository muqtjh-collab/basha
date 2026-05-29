import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '../../utils/permissions';
import { formatDate } from '../../utils/formatDate';

interface Customer {
  id: string;
  full_name: string;
  full_name_ar: string | null;
}

interface Branch {
  id: string;
  name_ar: string;
}

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
  agent_id: string;
  customer_id: string | null;
  branch_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  customer: {
    id: string;
    full_name: string;
    full_name_ar: string;
  } | null;
}

export const VehiclesAgentList: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'vehicles', 'read');
  const canWrite = hasPermission(currentUser, 'vehicles', 'write');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Form inputs
  const [formVin, setFormVin] = useState('');
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formColorAr, setFormColorAr] = useState('');
  const [formLotNumber, setFormLotNumber] = useState('');
  const [formAuctionSource, setFormAuctionSource] = useState<string>('copart');
  const [formPurchasePriceUsd, setFormPurchasePriceUsd] = useState('');
  const [formPurchasePriceIqd, setFormPurchasePriceIqd] = useState('');
  const [formAuctionFeesUsd, setFormAuctionFeesUsd] = useState('');
  const [formShippingFeesUsd, setFormShippingFeesUsd] = useState('');
  const [formShippingFeesIqd, setFormShippingFeesIqd] = useState('');
  const [formOtherFeesUsd, setFormOtherFeesUsd] = useState('');
  const [formOtherFeesIqd, setFormOtherFeesIqd] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVehicles = async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      const response = await api.get('/vehicles', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 10
        }
      });
      setVehicles(response.data.data);
      setTotalPages(response.data.pagination.pages || 1);
      setTotalItems(response.data.pagination.total || 0);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل قائمة السيارات.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [custRes, branchRes] = await Promise.all([
        api.get('/customers', { params: { limit: 200 } }),
        api.get('/branches', { params: { limit: 100 } })
      ]);
      setCustomers(custRes.data.data);
      setBranches(branchRes.data.data);
    } catch (err) {
      console.error('Failed to load vehicle form dependencies:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, statusFilter, page]);

  useEffect(() => {
    if (canRead) {
      fetchDependencies();
    }
  }, []);

  if (!canRead) {
    return (
      <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error font-bold">
        ⚠️ {ar.common.unauthorized}
      </div>
    );
  }

  const openCreateModal = () => {
    setFormVin('');
    setFormMake('');
    setFormModel('');
    setFormYear('');
    setFormColor('');
    setFormColorAr('');
    setFormLotNumber('');
    setFormAuctionSource('copart');
    setFormPurchasePriceUsd('');
    setFormPurchasePriceIqd('');
    setFormAuctionFeesUsd('');
    setFormShippingFeesUsd('');
    setFormShippingFeesIqd('');
    setFormOtherFeesUsd('');
    setFormOtherFeesIqd('');
    setFormCustomerId(customers[0]?.id || '');
    setFormBranchId(branches[0]?.id || '');
    setFormNotes('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormVin(vehicle.vin);
    setFormMake(vehicle.make || '');
    setFormModel(vehicle.model || '');
    setFormYear(vehicle.year?.toString() || '');
    setFormColor(vehicle.color || '');
    setFormColorAr(vehicle.color_ar || '');
    setFormLotNumber(vehicle.lot_number || '');
    setFormAuctionSource(vehicle.auction_source || 'copart');
    
    // Convert back from cents to dollars, fils to IQD
    setFormPurchasePriceUsd(vehicle.purchase_price_usd ? (vehicle.purchase_price_usd / 100).toString() : '');
    setFormPurchasePriceIqd(vehicle.purchase_price_iqd ? (vehicle.purchase_price_iqd / 1000).toString() : '');
    setFormAuctionFeesUsd(vehicle.auction_fees_usd ? (vehicle.auction_fees_usd / 100).toString() : '');
    setFormShippingFeesUsd(vehicle.shipping_fees_usd ? (vehicle.shipping_fees_usd / 100).toString() : '');
    setFormShippingFeesIqd(vehicle.shipping_fees_iqd ? (vehicle.shipping_fees_iqd / 1000).toString() : '');
    setFormOtherFeesUsd(vehicle.other_fees_usd ? (vehicle.other_fees_usd / 100).toString() : '');
    setFormOtherFeesIqd(vehicle.other_fees_iqd ? (vehicle.other_fees_iqd / 1000).toString() : '');

    setFormCustomerId(vehicle.customer_id || '');
    setFormBranchId(vehicle.branch_id || '');
    setFormNotes(vehicle.notes || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVin || formVin.length !== 17) {
      setFormError('رقم الهيكل VIN مطلوب ويجب أن يتكون من 17 حرفاً ورسماً.');
      return;
    }

    const payload = {
      vin: formVin,
      make: formMake || null,
      model: formModel || null,
      year: formYear ? parseInt(formYear, 10) : null,
      color: formColor || null,
      color_ar: formColorAr || null,
      lot_number: formLotNumber || null,
      auction_source: formAuctionSource || null,
      // Convert to cents & fils (integers)
      purchase_price_usd: formPurchasePriceUsd ? Math.round(parseFloat(formPurchasePriceUsd) * 100) : null,
      purchase_price_iqd: formPurchasePriceIqd ? Math.round(parseFloat(formPurchasePriceIqd) * 1000) : null,
      auction_fees_usd: formAuctionFeesUsd ? Math.round(parseFloat(formAuctionFeesUsd) * 100) : null,
      shipping_fees_usd: formShippingFeesUsd ? Math.round(parseFloat(formShippingFeesUsd) * 100) : null,
      shipping_fees_iqd: formShippingFeesIqd ? Math.round(parseFloat(formShippingFeesIqd) * 1000) : null,
      other_fees_usd: formOtherFeesUsd ? Math.round(parseFloat(formOtherFeesUsd) * 100) : null,
      other_fees_iqd: formOtherFeesIqd ? Math.round(parseFloat(formOtherFeesIqd) * 1000) : null,
      customer_id: formCustomerId || null,
      branch_id: formBranchId || null,
      notes: formNotes || null
    };

    setIsSubmitting(true);
    try {
      await api.post('/vehicles', payload);
      setIsCreateOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل إضافة المركبة الجديدة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    if (!formVin || formVin.length !== 17) {
      setFormError('رقم الهيكل VIN مطلوب وصالح.');
      return;
    }

    const payload = {
      vin: formVin,
      make: formMake || null,
      model: formModel || null,
      year: formYear ? parseInt(formYear, 10) : null,
      color: formColor || null,
      color_ar: formColorAr || null,
      lot_number: formLotNumber || null,
      auction_source: formAuctionSource || null,
      purchase_price_usd: formPurchasePriceUsd ? Math.round(parseFloat(formPurchasePriceUsd) * 100) : null,
      purchase_price_iqd: formPurchasePriceIqd ? Math.round(parseFloat(formPurchasePriceIqd) * 1000) : null,
      auction_fees_usd: formAuctionFeesUsd ? Math.round(parseFloat(formAuctionFeesUsd) * 100) : null,
      shipping_fees_usd: formShippingFeesUsd ? Math.round(parseFloat(formShippingFeesUsd) * 100) : null,
      shipping_fees_iqd: formShippingFeesIqd ? Math.round(parseFloat(formShippingFeesIqd) * 1000) : null,
      other_fees_usd: formOtherFeesUsd ? Math.round(parseFloat(formOtherFeesUsd) * 100) : null,
      other_fees_iqd: formOtherFeesIqd ? Math.round(parseFloat(formOtherFeesIqd) * 1000) : null,
      customer_id: formCustomerId || null,
      branch_id: formBranchId || null,
      notes: formNotes || null
    };

    setIsSubmitting(true);
    try {
      await api.put(`/vehicles/${selectedVehicle.id}`, payload);
      setIsEditOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث ملف المركبة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'vin',
      label: ar.vehicles.vin,
      render: (row: Vehicle) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono font-bold text-primary-dark select-all">{row.vin}</span>
          {row.lot_number && <span className="text-[10px] text-text-secondary font-mono">Lot: {row.lot_number}</span>}
        </div>
      )
    },
    {
      key: 'make',
      label: 'الصانع / الموديل / السنة',
      render: (row: Vehicle) => (
        <span>{row.make ? `${row.make} ${row.model || ''} (${row.year || ''})` : '-'}</span>
      )
    },
    {
      key: 'customer',
      label: ar.vehicles.customer,
      render: (row: Vehicle) => (
        <span>{row.customer?.full_name_ar || row.customer?.full_name || '-'}</span>
      )
    },
    {
      key: 'current_stage',
      label: ar.common.stage,
      render: (row: Vehicle) => (
        <span className="text-xs font-bold text-primary-accent">
          {(ar.stages16 as Record<string, string>)[row.current_stage] || row.current_stage}
        </span>
      )
    },
    {
      key: 'status',
      label: ar.common.status,
      render: (row: Vehicle) => (
        <Badge variant={row.status === 'active' ? 'success' : 'gray'}>
          {row.status === 'active' ? 'نشط' : 'مؤرشف'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: ar.common.created,
      render: (row: Vehicle) => <span>{formatDate(row.created_at)}</span>
    },
    {
      key: 'actions',
      label: ar.common.actions,
      cellAlign: 'center' as const,
      render: (row: Vehicle) => (
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/agent/vehicles/${row.id}`)}
            className="px-2.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary-dark/5 rounded border border-border transition-all"
          >
            {ar.common.details}
          </button>
          
          {canWrite && (
            <button
              onClick={() => openEditModal(row)}
              className="px-2.5 py-1 text-xs font-bold text-primary-accent border border-primary-accent/30 hover:bg-primary-accent/5 rounded transition-all"
            >
              {ar.common.edit}
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6 select-none text-right">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-primary-dark">قائمة مركباتي المستوردة</h1>
          <p className="text-xs text-text-secondary">تتبع وفهرسة السيارات والملفات المالية لعملائي المندمجين تحت محفظتي</p>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <span>➕</span>
            <span>{ar.vehicles.addVehicle}</span>
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/2">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">البحث النصي</label>
          <Input
            placeholder="ابحث برقم الشاصي VIN أو رقم اللوط للسيارة..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-full md:w-1/4">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">حالة الملف</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
          >
            <option value="">{ar.common.all}</option>
            <option value="active">نشط</option>
            <option value="archived">مؤرشف</option>
            <option value="cancelled">ملغي</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      {errorMsg ? (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-sm text-error">
          ⚠️ {errorMsg}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/agent/vehicles/${row.id}`)}
          emptyTitle="لا توجد سيارات"
          emptyDescription="لا توجد أي سيارات مضافة حالياً لمحفظتك تطابق شروط التصفية."
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2" dir="ltr">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            className="px-3 py-1 bg-white border border-border text-xs rounded hover:bg-bg-light disabled:opacity-50"
          >
            السابق
          </button>
          <span className="text-xs text-text-secondary font-mono">
            صفحة {page} من {totalPages} ({totalItems} سيارة)
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
            className="px-3 py-1 bg-white border border-border text-xs rounded hover:bg-bg-light disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={ar.vehicles.addVehicle}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              {ar.common.cancel}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleCreateSubmit} isLoading={isSubmitting}>
              {ar.common.save}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4 text-right">
          {formError && (
            <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label={ar.vehicles.vin}
              id="agent_vin"
              placeholder="17 حرف ورقم..."
              value={formVin}
              onChange={(e) => setFormVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              required
            />
            <Input
              label={ar.vehicles.make}
              id="agent_make"
              placeholder="e.g. Ford"
              value={formMake}
              onChange={(e) => setFormMake(e.target.value)}
            />
            <Input
              label={ar.vehicles.model}
              id="agent_model"
              placeholder="e.g. Explorer"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label={ar.vehicles.year}
              id="agent_year"
              type="number"
              placeholder="2026"
              value={formYear}
              onChange={(e) => setFormYear(e.target.value)}
            />
            <Input
              label={ar.vehicles.color}
              id="agent_color"
              placeholder="e.g. Black"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
            />
            <Input
              label={ar.vehicles.colorAr}
              id="agent_color_ar"
              placeholder="مثال: أسود"
              value={formColorAr}
              onChange={(e) => setFormColorAr(e.target.value)}
            />
            <Input
              label={ar.vehicles.lotNumber}
              id="agent_lot_number"
              placeholder="e.g. 7654321"
              value={formLotNumber}
              onChange={(e) => setFormLotNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.auctionSource}</label>
              <select
                value={formAuctionSource}
                onChange={(e) => setFormAuctionSource(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="copart">Copart</option>
                <option value="iaai">IAAI</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.customer}</label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">لا يوجد عميل محدد</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name_ar || c.full_name}</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.branch}</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">لا يوجد مكتب محدد</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border/80 pt-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-primary-dark">الرسوم والتكاليف المالية (بالسنت والفلس - تقبل أعداد صحيحة فقط)</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="سعر الشراء بالدولار ($)"
                id="agent_purchase_price_usd"
                type="number"
                placeholder="10000"
                value={formPurchasePriceUsd}
                onChange={(e) => setFormPurchasePriceUsd(e.target.value)}
              />
              <Input
                label="سعر الشراء بالدينار (د.ع)"
                id="agent_purchase_price_iqd"
                type="number"
                placeholder="15000000"
                value={formPurchasePriceIqd}
                onChange={(e) => setFormPurchasePriceIqd(e.target.value)}
              />
              <Input
                label="رسوم المزاد بالدولار ($)"
                id="agent_auction_fees_usd"
                type="number"
                placeholder="600"
                value={formAuctionFeesUsd}
                onChange={(e) => setFormAuctionFeesUsd(e.target.value)}
              />
              <Input
                label="رسوم الشحن بالدولار ($)"
                id="agent_shipping_fees_usd"
                type="number"
                placeholder="1200"
                value={formShippingFeesUsd}
                onChange={(e) => setFormShippingFeesUsd(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="رسوم الشحن بالدينار (د.ع)"
                id="agent_shipping_fees_iqd"
                type="number"
                placeholder="1800000"
                value={formShippingFeesIqd}
                onChange={(e) => setFormShippingFeesIqd(e.target.value)}
              />
              <Input
                label="رسوم أخرى بالدولار ($)"
                id="agent_other_fees_usd"
                type="number"
                placeholder="200"
                value={formOtherFeesUsd}
                onChange={(e) => setFormOtherFeesUsd(e.target.value)}
              />
            </div>
          </div>

          <div className="text-right">
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-border rounded-md p-2 text-xs h-20 focus:outline-none"
              placeholder="ملاحظات حول حالة الشراء أو المواصفات..."
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={ar.vehicles.editVehicle}
        size="lg"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
              {ar.common.cancel}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleEditSubmit} isLoading={isSubmitting}>
              {ar.common.save}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4 text-right">
          {formError && (
            <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label={ar.vehicles.vin}
              id="edit_agent_vin"
              value={formVin}
              onChange={(e) => setFormVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              required
            />
            <Input
              label={ar.vehicles.make}
              id="edit_agent_make"
              value={formMake}
              onChange={(e) => setFormMake(e.target.value)}
            />
            <Input
              label={ar.vehicles.model}
              id="edit_agent_model"
              value={formModel}
              onChange={(e) => setFormModel(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label={ar.vehicles.year}
              id="edit_agent_year"
              type="number"
              value={formYear}
              onChange={(e) => setFormYear(e.target.value)}
            />
            <Input
              label={ar.vehicles.color}
              id="edit_agent_color"
              value={formColor}
              onChange={(e) => setFormColor(e.target.value)}
            />
            <Input
              label={ar.vehicles.colorAr}
              id="edit_agent_color_ar"
              value={formColorAr}
              onChange={(e) => setFormColorAr(e.target.value)}
            />
            <Input
              label={ar.vehicles.lotNumber}
              id="edit_agent_lot_number"
              value={formLotNumber}
              onChange={(e) => setFormLotNumber(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.auctionSource}</label>
              <select
                value={formAuctionSource}
                onChange={(e) => setFormAuctionSource(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="copart">Copart</option>
                <option value="iaai">IAAI</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.customer}</label>
              <select
                value={formCustomerId}
                onChange={(e) => setFormCustomerId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">لا يوجد عميل محدد</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name_ar || c.full_name}</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.vehicles.branch}</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none"
              >
                <option value="">لا يوجد مكتب محدد</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border/80 pt-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-primary-dark">الرسوم والتكاليف المالية (بالسنت والفلس - تقبل أعداد صحيحة فقط)</span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="سعر الشراء بالدولار ($)"
                id="edit_agent_purchase_price_usd"
                type="number"
                value={formPurchasePriceUsd}
                onChange={(e) => setFormPurchasePriceUsd(e.target.value)}
              />
              <Input
                label="سعر الشراء بالدينار (د.ع)"
                id="edit_agent_purchase_price_iqd"
                type="number"
                value={formPurchasePriceIqd}
                onChange={(e) => setFormPurchasePriceIqd(e.target.value)}
              />
              <Input
                label="رسوم المزاد بالدولار ($)"
                id="edit_agent_auction_fees_usd"
                type="number"
                value={formAuctionFeesUsd}
                onChange={(e) => setFormAuctionFeesUsd(e.target.value)}
              />
              <Input
                label="رسوم الشحن بالدولار ($)"
                id="edit_agent_shipping_fees_usd"
                type="number"
                value={formShippingFeesUsd}
                onChange={(e) => setFormShippingFeesUsd(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="رسوم الشحن بالدينار (د.ع)"
                id="edit_agent_shipping_fees_iqd"
                type="number"
                value={formShippingFeesIqd}
                onChange={(e) => setFormShippingFeesIqd(e.target.value)}
              />
              <Input
                label="رسوم أخرى بالدولار ($)"
                id="edit_agent_other_fees_usd"
                type="number"
                value={formOtherFeesUsd}
                onChange={(e) => setFormOtherFeesUsd(e.target.value)}
              />
            </div>
          </div>

          <div className="text-right">
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-border rounded-md p-2 text-xs h-20 focus:outline-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VehiclesAgentList;
