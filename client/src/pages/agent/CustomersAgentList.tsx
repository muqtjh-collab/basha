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
}

export const CustomersAgentList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'customers', 'read');
  const canWrite = hasPermission(currentUser, 'customers', 'write');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, page]);

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
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName) {
      setFormError('الاسم الكامل مطلوب.');
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
        notes: formNotes || null
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

    if (!formFullName) {
      setFormError('الاسم الكامل مطلوب.');
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
        notes: formNotes || null
      });
      setIsEditOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث بيانات العميل.');
    } finally {
      setIsSubmitting(false);
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
          <h1 className="text-2xl font-bold text-primary-dark">قائمة عملائي المسجلين</h1>
          <p className="text-xs text-text-secondary">عرض وإدارة قائمة عملائك الخاصين وإضافتهم لملفات السيارات المستوردة</p>
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

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/2 text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">البحث النصي</label>
          <Input
            placeholder="ابحث باسم عميلك أو هاتف..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-full md:w-1/4 text-right">
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

      {/* Table view */}
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
          emptyTitle="لا توجد سجلات"
          emptyDescription="لم يتم العثور على أي عملاء مسجلين تحت حسابك حالياً."
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

      {/* Create Modal */}
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
              id="agent_cust_name"
              placeholder="e.g. John Doe"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.customers.fullNameAr}
              id="agent_cust_name_ar"
              placeholder="e.g. جون دو"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.customers.phone}
              id="agent_cust_phone"
              placeholder="e.g. +9647700000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <Input
              label={ar.customers.email}
              id="agent_cust_email"
              placeholder="e.g. john@example.com"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="المدينة (English)"
              id="agent_cust_city"
              placeholder="e.g. Basra"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.customers.cityAr}
              id="agent_cust_city_ar"
              placeholder="e.g. البصرة"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
            <Input
              label={ar.customers.region}
              id="agent_cust_region"
              placeholder="e.g. Al-Ashar"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات العميل</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full border border-border rounded-md p-2 text-xs h-20 focus:outline-none focus:ring-1 focus:ring-primary-accent"
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
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
              id="edit_agent_cust_name"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.customers.fullNameAr}
              id="edit_agent_cust_name_ar"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.customers.phone}
              id="edit_agent_cust_phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
            <Input
              label={ar.customers.email}
              id="edit_agent_cust_email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="المدينة (English)"
              id="edit_agent_cust_city"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.customers.cityAr}
              id="edit_agent_cust_city_ar"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
            <Input
              label={ar.customers.region}
              id="edit_agent_cust_region"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="text-xs font-bold text-text-primary block mb-1">ملاحظات العميل</label>
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
        title="ملف العميل الخاص بي"
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
            </div>

            <div className="flex flex-col gap-1 border-b border-border pb-4">
              <span className="text-[10px] text-text-secondary">ملاحظات</span>
              <p className="text-xs text-text-secondary bg-bg-light/20 p-3 rounded border border-border/40 min-h-[50px]">
                {selectedCustomer.notes || 'لا توجد ملاحظات.'}
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

export default CustomersAgentList;
