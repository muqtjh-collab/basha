import React, { useState, useEffect } from 'react';
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

interface Agent {
  id: string;
  full_name: string;
  full_name_ar: string;
}

interface Customer {
  id: string;
  user_id: string | null;
  agent_id: string;
  full_name: string;
  full_name_ar: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  city_ar: string | null;
  region: string | null;
  preferred_communication: 'phone' | 'whatsapp' | 'email' | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  agent: {
    id: string;
    full_name: string;
    full_name_ar: string;
  } | null;
}

export const CustomersList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'customers', 'read');
  const canWrite = hasPermission(currentUser, 'customers', 'write');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form state
  const [formFullName, setFormFullName] = useState('');
  const [formFullNameAr, setFormFullNameAr] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCityAr, setFormCityAr] = useState('');
  const [formRegion, setFormRegion] = useState('');
  const [formPreferredComm, setFormPreferredComm] = useState<string>('phone');
  const [formNotes, setFormNotes] = useState('');
  const [formAgentId, setFormAgentId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCustomers = async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      const response = await api.get('/customers', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          agent_id: agentFilter || undefined,
          page,
          limit: 10
        }
      });
      setCustomers(response.data.data);
      setTotalPages(response.data.pagination.pages || 1);
      setTotalItems(response.data.pagination.total || 0);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل العملاء.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await api.get('/agents', { params: { limit: 100 } });
      setAgents(response.data.data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, agentFilter, page]);

  useEffect(() => {
    if (canRead) {
      fetchAgents();
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
    setFormFullName('');
    setFormFullNameAr('');
    setFormPhone('');
    setFormEmail('');
    setFormCity('');
    setFormCityAr('');
    setFormRegion('');
    setFormPreferredComm('phone');
    setFormNotes('');
    setFormAgentId(agents[0]?.id || '');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormFullName(customer.full_name);
    setFormFullNameAr(customer.full_name_ar || '');
    setFormPhone(customer.phone || '');
    setFormEmail(customer.email || '');
    setFormCity(customer.city || '');
    setFormCityAr(customer.city_ar || '');
    setFormRegion(customer.region || '');
    setFormPreferredComm(customer.preferred_communication || 'phone');
    setFormNotes(customer.notes || '');
    setFormAgentId(customer.agent_id);
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName || !formAgentId) {
      setFormError('يرجى ملء الحقول المطلوبة (الاسم والوكيل المسؤول).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/customers', {
        full_name: formFullName,
        full_name_ar: formFullNameAr || null,
        phone: formPhone || null,
        email: formEmail || null,
        city: formCity || null,
        city_ar: formCityAr || null,
        region: formRegion || null,
        preferred_communication: formPreferredComm || null,
        notes: formNotes || null,
        agent_id: formAgentId
      });
      setIsCreateOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل إنشاء العميل الجديد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    if (!formFullName || !formAgentId) {
      setFormError('الاسم الكامل والوكيل المسؤول مطلوبان.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/customers/${selectedCustomer.id}`, {
        full_name: formFullName,
        full_name_ar: formFullNameAr || null,
        phone: formPhone || null,
        email: formEmail || null,
        city: formCity || null,
        city_ar: formCityAr || null,
        region: formRegion || null,
        preferred_communication: formPreferredComm || null,
        notes: formNotes || null,
        agent_id: formAgentId
      });
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث بيانات العميل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (customer: Customer) => {
    const newStatus = customer.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = newStatus === 'inactive'
      ? 'هل أنت متأكد من رغبتك في تعطيل هذا العميل؟'
      : 'هل أنت متأكد من تفعيل هذا العميل؟';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/customers/${customer.id}/status`, { status: newStatus });
      fetchCustomers();
    } catch (err: any) {
      alert(err.messageAr || 'فشل تغيير حالة العميل.');
    }
  };

  const columns = [
    {
      key: 'full_name',
      label: ar.customers.fullName,
      render: (row: Customer) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary-dark">{row.full_name_ar || row.full_name}</span>
          {row.full_name_ar && <span className="text-[10px] text-text-secondary font-mono">{row.full_name}</span>}
        </div>
      )
    },
    {
      key: 'phone',
      label: ar.customers.phone,
      render: (row: Customer) => <span>{row.phone || '-'}</span>
    },
    {
      key: 'city_ar',
      label: ar.customers.cityAr,
      render: (row: Customer) => <span>{row.city_ar || row.city || '-'}</span>
    },
    {
      key: 'agent',
      label: ar.vehicles.agent,
      render: (row: Customer) => <span>{row.agent?.full_name_ar || row.agent?.full_name || '-'}</span>
    },
    {
      key: 'status',
      label: ar.common.status,
      render: (row: Customer) => (
        <Badge variant={row.status === 'active' ? 'success' : 'gray'}>
          {row.status === 'active' ? 'نشط' : 'غير نشط'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: ar.common.created,
      render: (row: Customer) => <span>{formatDate(row.created_at)}</span>
    },
    {
      key: 'actions',
      label: ar.common.actions,
      cellAlign: 'center' as const,
      render: (row: Customer) => (
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetailModal(row)}
            className="px-2.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary-dark/5 rounded border border-border transition-all"
          >
            {ar.common.details}
          </button>
          
          {canWrite && (
            <>
              <button
                onClick={() => openEditModal(row)}
                className="px-2.5 py-1 text-xs font-bold text-primary-accent border border-primary-accent/30 hover:bg-primary-accent/5 rounded transition-all"
              >
                {ar.common.edit}
              </button>

              <button
                onClick={() => handleToggleStatus(row)}
                className={`px-2.5 py-1 text-xs font-bold rounded border transition-all ${
                  row.status === 'active'
                    ? 'text-warning border-warning/30 hover:bg-warning/5'
                    : 'text-success border-success/30 hover:bg-success/5'
                }`}
              >
                {row.status === 'active' ? 'تعطيل' : 'تفعيل'}
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  const commLabels: Record<string, string> = {
    phone: ar.customers.preferredCommunicationPhone,
    whatsapp: ar.customers.preferredCommunicationWhatsapp,
    email: ar.customers.preferredCommunicationEmail
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1 text-right">
          <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.customers}</h1>
          <p className="text-xs text-text-secondary">إدارة عملاء شركة الباشا لربط ملفات المركبات وتتبع شحناتهم</p>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <span>➕</span>
            <span>{ar.customers.addCustomer}</span>
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">البحث النصي</label>
          <Input
            placeholder="ابحث باسم العميل أو رقم الهاتف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">الوكيل المسؤول</label>
          <select
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
          >
            <option value="">{ar.common.all}</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.full_name_ar || a.full_name}</option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">الحالة</label>
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
            <option value="inactive">غير نشط</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      {errorMsg ? (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error">
          ⚠️ {errorMsg}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={customers}
          isLoading={isLoading}
          onRowClick={(row) => openDetailModal(row)}
          emptyTitle="لا توجد نتائج"
          emptyDescription="لم نجد عملاء مطابقين لبحثك."
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
            صفحة {page} من {totalPages} ({totalItems} عميل)
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

      {/* Create Customer modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={ar.customers.addCustomer}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="الاسم الكامل (English)"
              id="customer_name"
              placeholder="e.g. John Doe"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.customers.fullNameAr}
              id="customer_name_ar"
              placeholder="e.g. جون دو"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.customers.phone}
              id="customer_phone"
              placeholder="e.g. +9647700000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <Input
              label={ar.customers.email}
              id="customer_email"
              placeholder="e.g. john@example.com"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="المدينة (English)"
              id="customer_city"
              placeholder="e.g. Baghdad"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.customers.cityAr}
              id="customer_city_ar"
              placeholder="e.g. بغداد"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
            <Input
              label={ar.customers.region}
              id="customer_region"
              placeholder="e.g. Al-Mansour"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">الوكيل المسؤول</label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
                required
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name_ar || a.full_name}</option>
                ))}
              </select>
            </div>
            
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.customers.preferredCommunication}</label>
              <select
                value={formPreferredComm}
                onChange={(e) => setFormPreferredComm(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
              >
                <option value="phone">هاتف</option>
                <option value="whatsapp">واتساب</option>
                <option value="email">بريد إلكتروني</option>
              </select>
            </div>
          </div>

          <div className="text-right">
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات إضافية</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-border rounded-md p-2 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary-accent"
              placeholder="أدخل أي ملاحظات حول العميل هنا..."
            />
          </div>
        </form>
      </Modal>

      {/* Edit Customer modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={ar.customers.editCustomer}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="الاسم الكامل (English)"
              id="edit_customer_name"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.customers.fullNameAr}
              id="edit_customer_name_ar"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.customers.phone}
              id="edit_customer_phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <Input
              label={ar.customers.email}
              id="edit_customer_email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="المدينة (English)"
              id="edit_customer_city"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.customers.cityAr}
              id="edit_customer_city_ar"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
            <Input
              label={ar.customers.region}
              id="edit_customer_region"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">الوكيل المسؤول</label>
              <select
                value={formAgentId}
                onChange={(e) => setFormAgentId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
                required
              >
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name_ar || a.full_name}</option>
                ))}
              </select>
            </div>
            
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.customers.preferredCommunication}</label>
              <select
                value={formPreferredComm}
                onChange={(e) => setFormPreferredComm(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
              >
                <option value="phone">هاتف</option>
                <option value="whatsapp">واتساب</option>
                <option value="email">بريد إلكتروني</option>
              </select>
            </div>
          </div>

          <div className="text-right">
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات إضافية</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-border rounded-md p-2 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary-accent"
            />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="ملف بيانات العميل الشخصي"
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
            إغلاق
          </Button>
        }
      >
        {selectedCustomer && (
          <div className="flex flex-col gap-6 text-right">
            <div className="bg-bg-light/40 border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">اسم العميل</span>
                <span className="text-xs font-bold text-primary-dark">{selectedCustomer.full_name_ar || selectedCustomer.full_name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">الاسم الأجنبي (English)</span>
                <span className="text-xs font-semibold text-text-secondary">{selectedCustomer.full_name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.customers.phone}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedCustomer.phone || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.customers.email}</span>
                <span className="text-xs font-mono font-semibold text-text-secondary">{selectedCustomer.email || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.customers.cityAr}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedCustomer.city_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">المدينة (English)</span>
                <span className="text-xs font-semibold text-text-secondary">{selectedCustomer.city || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.customers.region}</span>
                <span className="text-xs text-text-secondary">{selectedCustomer.region || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">وسيلة التواصل المفضلة</span>
                <span className="text-xs font-bold text-primary-dark">{selectedCustomer.preferred_communication ? commLabels[selectedCustomer.preferred_communication] : '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">الوكيل المسؤول</span>
                <span className="text-xs font-bold text-primary-accent">{selectedCustomer.agent?.full_name_ar || selectedCustomer.agent?.full_name || '-'}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-text-secondary">ملاحظات</span>
              <p className="text-xs text-text-secondary bg-bg-light/20 p-3 rounded border border-border/40 min-h-[50px]">
                {selectedCustomer.notes || 'لا توجد ملاحظات مسجلة لهذا العميل.'}
              </p>
            </div>

            {/* Placeholder section: المركبات المرتبطة */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-text-primary block border-r-4 border-primary-accent pr-2">المركبات المرتبطة (قريباً)</span>
              <div className="text-center py-8 text-xs text-text-secondary bg-bg-light/20 rounded border border-dashed border-border">
                {ar.customers.noLinkedVehicles}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomersList;
