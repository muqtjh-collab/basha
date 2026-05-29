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

interface Branch {
  id: string;
  name: string;
  name_ar: string;
  city: string | null;
  city_ar: string | null;
  region: string | null;
  region_ar: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  created_by: string | null;
  user_count?: number;
}

export const BranchesList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'branches', 'read');
  const canWrite = hasPermission(currentUser, 'branches', 'write');

  const [branches, setBranches] = useState<Branch[]>([]);
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
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formCityAr, setFormCityAr] = useState('');
  const [formRegion, setFormRegion] = useState('');
  const [formRegionAr, setFormRegionAr] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchBranches = async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      const response = await api.get('/branches', {
        params: {
          search: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 10
        }
      });
      setBranches(response.data.data);
      setTotalPages(response.data.pagination.pages || 1);
      setTotalItems(response.data.pagination.total || 0);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل الفروع.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [search, statusFilter, page]);

  if (!canRead) {
    return (
      <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error font-bold">
        ⚠️ {ar.common.unauthorized}
      </div>
    );
  }

  const openCreateModal = () => {
    setFormName('');
    setFormNameAr('');
    setFormCity('');
    setFormCityAr('');
    setFormRegion('');
    setFormRegionAr('');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setFormName(branch.name);
    setFormNameAr(branch.name_ar);
    setFormCity(branch.city || '');
    setFormCityAr(branch.city_ar || '');
    setFormRegion(branch.region || '');
    setFormRegionAr(branch.region_ar || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsDetailOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNameAr) {
      setFormError('يرجى ملء الحقول المطلوبة (اسم الفرع والاسم بالعربي).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/branches', {
        name: formName,
        name_ar: formNameAr,
        city: formCity || null,
        city_ar: formCityAr || null,
        region: formRegion || null,
        region_ar: formRegionAr || null
      });
      setIsCreateOpen(false);
      fetchBranches();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل إنشاء الفرع الجديد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    if (!formNameAr) {
      setFormError('اسم الفرع بالعربية مطلوب.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/branches/${selectedBranch.id}`, {
        name: formName,
        name_ar: formNameAr,
        city: formCity || null,
        city_ar: formCityAr || null,
        region: formRegion || null,
        region_ar: formRegionAr || null
      });
      setIsEditOpen(false);
      fetchBranches();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث بيانات الفرع.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = newStatus === 'inactive'
      ? 'هل أنت متأكد من رغبتك في تعطيل هذا الفرع؟'
      : 'هل أنت متأكد من تفعيل هذا الفرع؟';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/branches/${branch.id}/status`, { status: newStatus });
      fetchBranches();
    } catch (err: any) {
      alert(err.messageAr || 'فشل تغيير حالة الفرع.');
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الفرع؟')) {
      return;
    }

    try {
      await api.delete(`/branches/${branchId}`);
      fetchBranches();
    } catch (err: any) {
      alert(err.messageAr || 'فشل حذف الفرع.');
    }
  };

  const columns = [
    {
      key: 'name_ar',
      label: ar.branches.nameAr,
      render: (row: Branch) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary-dark">{row.name_ar}</span>
          <span className="text-[10px] text-text-secondary font-mono">{row.name}</span>
        </div>
      )
    },
    {
      key: 'city_ar',
      label: ar.branches.cityAr,
      render: (row: Branch) => <span>{row.city_ar || '-'}</span>
    },
    {
      key: 'status',
      label: ar.branches.status,
      render: (row: Branch) => (
        <Badge variant={row.status === 'active' ? 'success' : 'gray'}>
          {row.status === 'active' ? 'نشط' : 'غير نشط'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: ar.common.created,
      render: (row: Branch) => <span>{formatDate(row.created_at)}</span>
    },
    {
      key: 'actions',
      label: ar.common.actions,
      cellAlign: 'center' as const,
      render: (row: Branch) => (
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

              {currentUser?.role.name === 'super_admin' && (
                <button
                  onClick={() => handleDeleteBranch(row.id)}
                  className="px-2.5 py-1 text-xs font-bold text-error border border-error/30 hover:bg-error/5 rounded transition-all"
                >
                  {ar.common.delete}
                </button>
              )}
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1 text-right">
          <h1 className="text-2xl font-bold text-primary-dark">{ar.branches.title}</h1>
          <p className="text-xs text-text-secondary">إدارة الفروع والمكاتب الجغرافية للشركة لتوزيع الصلاحيات وسجلات المركبات</p>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <span>➕</span>
            <span>{ar.branches.addBranch}</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-1/3 text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">البحث النصي</label>
          <Input
            placeholder="ابحث باسم الفرع أو المدينة..."
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

      {/* Main Table view */}
      {errorMsg ? (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error">
          ⚠️ {errorMsg}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={branches}
          isLoading={isLoading}
          onRowClick={(row) => openDetailModal(row)}
          emptyTitle="لا توجد فروع"
          emptyDescription="لم يتم العثور على أي فروع مطابقة للفلاتر الحالية."
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
            صفحة {page} من {totalPages} ({totalItems} عنصر)
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
        title={ar.branches.addBranch}
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
        <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.name}
              id="branch_name"
              placeholder="e.g. Baghdad Branch"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label={ar.branches.nameAr}
              id="branch_name_ar"
              placeholder="e.g. فرع بغداد"
              value={formNameAr}
              onChange={(e) => setFormNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.city}
              id="branch_city"
              placeholder="e.g. Baghdad"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.branches.cityAr}
              id="branch_city_ar"
              placeholder="e.g. بغداد"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.region}
              id="branch_region"
              placeholder="e.g. Karrada"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
            <Input
              label={ar.branches.regionAr}
              id="branch_region_ar"
              placeholder="e.g. الكرادة"
              value={formRegionAr}
              onChange={(e) => setFormRegionAr(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={ar.branches.editBranch}
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
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          {formError && (
            <div className="bg-error/10 border border-error/20 p-3 rounded text-xs text-error font-semibold">
              ⚠️ {formError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.name}
              id="edit_branch_name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <Input
              label={ar.branches.nameAr}
              id="edit_branch_name_ar"
              value={formNameAr}
              onChange={(e) => setFormNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.city}
              id="edit_branch_city"
              value={formCity}
              onChange={(e) => setFormCity(e.target.value)}
            />
            <Input
              label={ar.branches.cityAr}
              id="edit_branch_city_ar"
              value={formCityAr}
              onChange={(e) => setFormCityAr(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.branches.region}
              id="edit_branch_region"
              value={formRegion}
              onChange={(e) => setFormRegion(e.target.value)}
            />
            <Input
              label={ar.branches.regionAr}
              id="edit_branch_region_ar"
              value={formRegionAr}
              onChange={(e) => setFormRegionAr(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={ar.branches.detailTitle}
        size="md"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
            إغلاق
          </Button>
        }
      >
        {selectedBranch && (
          <div className="flex flex-col gap-4 text-right">
            <div className="border-b border-border pb-4 bg-bg-light/40 p-4 rounded-lg grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.nameAr}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.name_ar}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.name}</span>
                <span className="text-xs font-bold text-primary-dark font-mono">{selectedBranch.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.cityAr}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.city_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.city}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.city || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.regionAr}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.region_ar || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.region}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.region || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.status}</span>
                <div>
                  <Badge variant={selectedBranch.status === 'active' ? 'success' : 'gray'}>
                    {selectedBranch.status === 'active' ? 'نشط' : 'غير نشط'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.branches.userCount}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedBranch.user_count ?? 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.common.created}</span>
                <span className="text-xs text-text-secondary">{formatDate(selectedBranch.created_at)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BranchesList;
