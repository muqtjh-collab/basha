import React, { useState, useEffect } from 'react';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import DataTable from '../../components/common/DataTable';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '../../utils/permissions';

interface Role {
  id: string;
  name: string;
  nameAr: string;
  level: number;
  isSystem: boolean;
  description: string | null;
  descriptionAr: string | null;
  defaultPermissions: any;
  createdAt: string;
  updatedAt: string;
}

interface AssignedUser {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  fullNameAr: string;
  status: string;
}

const initialPermissions = {
  vehicles: { read: false, write: false, delete: false },
  customers: { read: false, write: false, delete: false },
  agents: { read: false, write: false, delete: false },
  wallets: { read: false, write: false },
  receipts: { read: false, write: false },
  roles: { read: false, write: false, delete: false },
  branches: { read: false, write: false, delete: false },
  reports: { read: false },
  audit_log: { read: false },
  settings: { read: false, write: false }
};

export const RolesList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canWrite = hasPermission(currentUser, 'roles', 'write');
  const canDelete = hasPermission(currentUser, 'roles', 'delete');

  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Detail modal users list
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formNameAr, setFormNameAr] = useState('');
  const [formLevel, setFormLevel] = useState('5');
  const [formDesc, setFormDesc] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formPermissions, setFormPermissions] = useState<any>({ ...initialPermissions });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/roles');
      setRoles(response.data.data);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل الأدوار والصلاحيات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setFormName('');
    setFormNameAr('');
    setFormLevel('5');
    setFormDesc('');
    setFormDescAr('');
    setFormPermissions(JSON.parse(JSON.stringify(initialPermissions)));
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormName(role.name);
    setFormNameAr(role.nameAr);
    setFormLevel(role.level.toString());
    setFormDesc(role.description || '');
    setFormDescAr(role.descriptionAr || '');
    
    // Deep clone and merge permissions to match our standard formPermissions shape
    const merged = JSON.parse(JSON.stringify(initialPermissions));
    const rolePerms = role.defaultPermissions || {};
    for (const key in merged) {
      if (rolePerms[key]) {
        merged[key] = {
          ...merged[key],
          ...rolePerms[key]
        };
      }
    }
    setFormPermissions(merged);
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailModal = async (role: Role) => {
    setSelectedRole(role);
    setIsDetailOpen(true);
    setIsLoadingUsers(true);
    try {
      const response = await api.get(`/roles/${role.id}/users`);
      setAssignedUsers(response.data.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePermissionChange = (module: string, action: string, value: boolean) => {
    setFormPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: value
      }
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formNameAr || !formLevel) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    const lvl = parseInt(formLevel, 10);
    if (isNaN(lvl) || lvl <= 0) {
      setFormError('يجب أن يكون مستوى الدور رقماً صحيحاً موجباً.');
      return;
    }

    if (currentUser && lvl < currentUser.role.level) {
      setFormError('لا يمكنك إنشاء دور بصلاحيات تفوق صلاحياتك الحالية.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/roles', {
        name: formName,
        nameAr: formNameAr,
        level: lvl,
        description: formDesc,
        descriptionAr: formDescAr,
        defaultPermissions: formPermissions
      });
      setIsCreateOpen(false);
      fetchRoles();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل إنشاء الدور الجديد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (!formNameAr || !formLevel) {
      setFormError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    const lvl = parseInt(formLevel, 10);
    if (isNaN(lvl) || lvl <= 0) {
      setFormError('يجب أن يكون مستوى الدور رقماً صحيحاً موجباً.');
      return;
    }

    if (currentUser && lvl < currentUser.role.level) {
      setFormError('لا يمكنك منح صلاحيات تفوق صلاحياتك الحالية.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, {
        nameAr: formNameAr,
        level: lvl,
        description: formDesc,
        descriptionAr: formDescAr,
        defaultPermissions: formPermissions
      });
      setIsEditOpen(false);
      fetchRoles();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث بيانات الدور.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الدور؟ لا يمكن التراجع عن هذه العملية.')) {
      return;
    }

    try {
      await api.delete(`/roles/${roleId}`);
      fetchRoles();
    } catch (err: any) {
      alert(err.messageAr || 'فشل حذف الدور. تأكد من عدم ارتباطه بمستخدمين حاليين.');
    }
  };

  const columns = [
    {
      key: 'nameAr',
      label: 'اسم الدور',
      render: (row: Role) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary-dark">{row.nameAr}</span>
          <span className="text-[10px] text-text-secondary font-mono">{row.name}</span>
        </div>
      )
    },
    {
      key: 'level',
      label: 'المستوى الهرمي',
      render: (row: Role) => (
        <span className="font-mono bg-bg-light px-2 py-1 rounded text-xs border border-border">
          {row.level}
        </span>
      )
    },
    {
      key: 'isSystem',
      label: 'نوع الدور',
      render: (row: Role) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
          row.isSystem ? 'bg-primary-dark/10 text-primary-dark border border-primary-dark/20' : 'bg-success/15 text-success border border-success/20'
        }`}>
          {row.isSystem ? 'أساسي (نظام)' : 'مخصص'}
        </span>
      )
    },
    {
      key: 'descriptionAr',
      label: 'الوصف',
      render: (row: Role) => (
        <span className="text-xs text-text-secondary block max-w-xs truncate">
          {row.descriptionAr || '-'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'الإجراءات',
      cellAlign: 'center' as const,
      render: (row: Role) => (
        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetailModal(row)}
            className="px-2.5 py-1 text-xs font-bold text-primary-dark hover:bg-primary-dark/5 rounded border border-border transition-all"
          >
            عرض التفاصيل
          </button>
          
          <button
            onClick={() => openEditModal(row)}
            disabled={row.isSystem || !canWrite}
            className={`px-2.5 py-1 text-xs font-bold rounded border transition-all ${
              row.isSystem || !canWrite
                ? 'text-text-secondary/40 border-border bg-bg-light cursor-not-allowed'
                : 'text-primary-accent border-primary-accent/30 hover:bg-primary-accent/5'
            }`}
          >
            تعديل
          </button>

          <button
            onClick={() => handleDeleteRole(row.id)}
            disabled={row.isSystem || !canDelete}
            className={`px-2.5 py-1 text-xs font-bold rounded border transition-all ${
              row.isSystem || !canDelete
                ? 'text-text-secondary/40 border-border bg-bg-light cursor-not-allowed'
                : 'text-error border-error/30 hover:bg-error/5'
            }`}
          >
            حذف
          </button>
        </div>
      )
    }
  ];

  const renderPermissionsTable = (readonly: boolean = false) => {
    const modules = Object.keys(initialPermissions) as (keyof typeof initialPermissions)[];
    
    const moduleLabels: Record<string, string> = {
      vehicles: 'المركبات والسيارات',
      customers: 'قاعدة بيانات العملاء',
      agents: 'إدارة الوكلاء الفيدراليين',
      wallets: 'المحافظ المالية والأرصدة',
      receipts: 'مراجعة واعتماد الإيصالات',
      roles: 'إدارة الصلاحيات والأدوار',
      branches: 'الفروع الجغرافية',
      reports: 'التقارير المالية واللوجستية',
      audit_log: 'سجلات النشاط والتدقيق',
      settings: 'إعدادات النظام الرئيسية'
    };

    return (
      <div className="w-full overflow-x-auto border border-border rounded-lg mt-2 select-none">
        <table className="w-full text-right text-xs table-auto border-collapse">
          <thead>
            <tr className="bg-bg-light border-b border-border text-text-primary font-bold">
              <th className="px-4 py-2.5">الموديول / الوحدة</th>
              <th className="px-4 py-2.5 text-center">قراءة (Read)</th>
              <th className="px-4 py-2.5 text-center">كتابة / تعديل (Write)</th>
              <th className="px-4 py-2.5 text-center">حذف (Delete)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modules.map((mod) => {
              const current = formPermissions[mod] || {};
              const hasRead = 'read' in current;
              const hasWrite = 'write' in current;
              const hasDelete = 'delete' in current;

              return (
                <tr key={mod} className="hover:bg-bg-light/30">
                  <td className="px-4 py-2 font-semibold text-text-primary">{moduleLabels[mod] || mod}</td>
                  
                  {/* Read Checkbox */}
                  <td className="px-4 py-2 text-center">
                    {hasRead ? (
                      <input
                        type="checkbox"
                        checked={current.read}
                        disabled={readonly}
                        onChange={(e) => handlePermissionChange(mod, 'read', e.target.checked)}
                        className="rounded border-border text-primary-accent focus:ring-primary-accent"
                      />
                    ) : '-'}
                  </td>

                  {/* Write Checkbox */}
                  <td className="px-4 py-2 text-center">
                    {hasWrite ? (
                      <input
                        type="checkbox"
                        checked={current.write}
                        disabled={readonly}
                        onChange={(e) => handlePermissionChange(mod, 'write', e.target.checked)}
                        className="rounded border-border text-primary-accent focus:ring-primary-accent"
                      />
                    ) : '-'}
                  </td>

                  {/* Delete Checkbox */}
                  <td className="px-4 py-2 text-center">
                    {hasDelete ? (
                      <input
                        type="checkbox"
                        checked={current.delete}
                        disabled={readonly}
                        onChange={(e) => handlePermissionChange(mod, 'delete', e.target.checked)}
                        className="rounded border-border text-primary-accent focus:ring-primary-accent"
                      />
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 select-none">
        <div className="flex flex-col gap-1 text-right">
          <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.roles}</h1>
          <p className="text-xs text-text-secondary">إدارة وتحديد الأدوار للموظفين وصلاحيات الوصول للمقاطع والوظائف المختلفة</p>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <span>➕</span>
            <span>إضافة دور جديد</span>
          </Button>
        )}
      </div>

      {/* Main Table view */}
      {errorMsg ? (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error">
          ⚠️ {errorMsg}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={roles}
          isLoading={isLoading}
          onRowClick={(row) => openDetailModal(row)}
          emptyTitle="لا توجد أدوار مخصصة"
          emptyDescription="لم يتم العثور على أي أدوار مخصصة في النظام حالياً."
        />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="إنشاء دور جديد في النظام"
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
              label="رمز المعرف (بالإنكليزية)"
              id="role_name"
              placeholder="e.g. branch_accountant"
              value={formName}
              onChange={(e) => setFormName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              required
            />
            <Input
              label="اسم الدور بالعربية"
              id="role_name_ar"
              placeholder="e.g. محاسب الفرع"
              value={formNameAr}
              onChange={(e) => setFormNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="المستوى الهرمي (أرقام فقط)"
              id="role_level"
              type="number"
              placeholder="5"
              value={formLevel}
              onChange={(e) => setFormLevel(e.target.value)}
              required
            />
            <Input
              label="الوصف بالعربية"
              id="role_desc_ar"
              placeholder="وصف مختصر للمهام المنوطة بهذا الدور"
              value={formDescAr}
              onChange={(e) => setFormDescAr(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-primary block mb-1">جدول الصلاحيات التفصيلية</label>
            {renderPermissionsTable(false)}
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`تعديل صلاحيات الدور: ${selectedRole?.nameAr}`}
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
            <div>
              <label className="text-xs font-bold text-text-secondary block mb-1">رمز المعرف (لا يمكن تعديله)</label>
              <div className="bg-bg-light border border-border px-3 py-2 rounded text-xs font-mono select-all text-text-secondary">
                {formName}
              </div>
            </div>
            <Input
              label="اسم الدور بالعربية"
              id="role_name_ar"
              value={formNameAr}
              onChange={(e) => setFormNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="المستوى الهرمي (أرقام فقط)"
              id="role_level"
              type="number"
              value={formLevel}
              onChange={(e) => setFormLevel(e.target.value)}
              required
            />
            <Input
              label="الوصف بالعربية"
              id="role_desc_ar"
              value={formDescAr}
              onChange={(e) => setFormDescAr(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-primary block mb-1">جدول الصلاحيات التفصيلية</label>
            {renderPermissionsTable(false)}
          </div>
        </form>
      </Modal>

      {/* Detail view Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`تفاصيل الصلاحيات: ${selectedRole?.nameAr}`}
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
            إغلاق النافذة
          </Button>
        }
      >
        {selectedRole && (
          <div className="flex flex-col gap-6">
            {/* Properties summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-border pb-4 bg-bg-light/40 p-4 rounded-lg">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">الاسم البرمجي (English)</span>
                <span className="text-xs font-mono font-bold text-primary-dark">{selectedRole.name}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">المستوى الهرمي للهيكل</span>
                <span className="text-xs font-bold text-primary-dark">{selectedRole.level}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">تصنيف الحماية</span>
                <span className="text-xs font-bold text-primary-dark">
                  {selectedRole.isSystem ? '🔒 أساسي في النظام (محمي)' : '🟢 مخصص'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-text-primary">وصف الدور والمهام:</span>
              <p className="text-xs text-text-secondary bg-bg-light/20 p-3 rounded border border-border/40">
                {selectedRole.descriptionAr || 'لا يوجد وصف متاح باللغة العربية لهذا الدور حالياً.'}
              </p>
            </div>

            {/* Permission checklist grid */}
            <div>
              <span className="text-xs font-bold text-text-primary block mb-1.5">صلاحيات هذا الدور التفصيلية:</span>
              {/* Copy selected role perms to state so renderPermissionsTable works */}
              {(() => {
                // Synchronize state for rendering if different
                const currentFormStr = JSON.stringify(formPermissions);
                const expected = JSON.parse(JSON.stringify(initialPermissions));
                const rp = selectedRole.defaultPermissions || {};
                for (const key in expected) {
                  if (rp[key]) {
                    expected[key] = { ...expected[key], ...rp[key] };
                  }
                }
                const expectedStr = JSON.stringify(expected);
                if (currentFormStr !== expectedStr) {
                  setTimeout(() => setFormPermissions(expected), 0);
                }
                return null;
              })()}
              {renderPermissionsTable(true)}
            </div>

            {/* Assigned users */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-text-primary">المستخدمين المرتبطين بهذا الدور حالياً:</span>
              
              {isLoadingUsers ? (
                <LoadingSpinner label="جاري جلب حسابات المستخدمين المرتبطة..." size="sm" />
              ) : assignedUsers.length === 0 ? (
                <div className="text-center py-6 text-xs text-text-secondary bg-bg-light/20 rounded border border-dashed border-border">
                  لا توجد حسابات مستخدمين مسندة لهذا الدور حالياً.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border custom-scrollbar">
                  {assignedUsers.map((u) => (
                    <div key={u.id} className="flex justify-between items-center px-4 py-2.5 text-xs hover:bg-bg-light/30">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-primary-dark">{u.fullNameAr}</span>
                        {u.username && <span className="text-[10px] text-text-secondary font-mono">{u.username}</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        u.status === 'active' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                      }`}>
                        {u.status === 'active' ? 'نشط' : 'معلق'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default RolesList;
