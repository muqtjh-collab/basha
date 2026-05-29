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
import { formatUSD, formatIQD } from '../../utils/formatCurrency';

interface Role {
  id: string;
  name: string;
  nameAr: string;
  level: number;
}

interface Branch {
  id: string;
  name: string;
  name_ar: string;
}

interface Agent {
  id: string;
  username: string;
  email: string | null;
  phone: string | null;
  full_name: string;
  full_name_ar: string;
  role_id: string;
  branch_id: string | null;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
  role: Role;
  branch: Branch | null;
  customer_count: number;
  vehicle_count: number;
  wallet: {
    balance_usd: number;
    balance_iqd: number;
  };
}

export const AgentsList: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const canRead = hasPermission(currentUser, 'agents', 'read');
  const canWrite = hasPermission(currentUser, 'agents', 'write');

  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Form state
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formFullNameAr, setFormFullNameAr] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formBranchId, setFormBranchId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAgents = async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      const response = await api.get('/agents', {
        params: {
          search: search || undefined,
          branch_id: branchFilter || undefined,
          role_id: roleFilter || undefined,
          status: statusFilter || undefined,
          page,
          limit: 10
        }
      });
      setAgents(response.data.data);
      setTotalPages(response.data.pagination.pages || 1);
      setTotalItems(response.data.pagination.total || 0);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل بيانات الوكلاء.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBranchesAndRoles = async () => {
    try {
      const [branchRes, roleRes] = await Promise.all([
        api.get('/branches', { params: { limit: 100 } }),
        api.get('/roles')
      ]);
      setBranches(branchRes.data.data);
      
      // Filter roles to only include agent level roles (level 4 & 5)
      const agentRoles = roleRes.data.data.filter((r: Role) => [4, 5].includes(r.level));
      setRoles(agentRoles);
    } catch (err) {
      console.error('Failed to load branches and roles:', err);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, [search, branchFilter, roleFilter, statusFilter, page]);

  useEffect(() => {
    if (canRead) {
      fetchBranchesAndRoles();
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
    setFormUsername('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormFullName('');
    setFormFullNameAr('');
    setFormRoleId(roles[0]?.id || '');
    setFormBranchId(branches[0]?.id || '');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const openEditModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormUsername(agent.username);
    setFormEmail(agent.email || '');
    setFormPhone(agent.phone || '');
    setFormPassword('');
    setFormFullName(agent.full_name);
    setFormFullNameAr(agent.full_name_ar);
    setFormRoleId(agent.role_id);
    setFormBranchId(agent.branch_id || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  const openDetailModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsDetailOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formPassword || !formFullName || !formFullNameAr || !formRoleId) {
      setFormError('يرجى ملء الحقول المطلوبة (اسم المستخدم، كلمة المرور، الاسم الكامل، الدور).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/agents', {
        username: formUsername,
        email: formEmail || null,
        phone: formPhone || null,
        password: formPassword,
        full_name: formFullName,
        full_name_ar: formFullNameAr,
        role_id: formRoleId,
        branch_id: formBranchId || null
      });
      setIsCreateOpen(false);
      fetchAgents();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل إنشاء حساب الوكيل الجديد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    if (!formUsername || !formFullName || !formFullNameAr || !formRoleId) {
      setFormError('يرجى ملء الحقول المطلوبة.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.put(`/agents/${selectedAgent.id}`, {
        username: formUsername,
        email: formEmail || null,
        phone: formPhone || null,
        password: formPassword || undefined,
        full_name: formFullName,
        full_name_ar: formFullNameAr,
        role_id: formRoleId,
        branch_id: formBranchId || null
      });
      setIsEditOpen(false);
      fetchAgents();
    } catch (err: any) {
      setFormError(err.messageAr || 'فشل تحديث بيانات الوكيل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'active' ? 'suspended' : 'active';
    const confirmMsg = newStatus === 'suspended'
      ? 'هل أنت متأكد من رغبتك في إيقاف حساب هذا الوكيل؟'
      : 'هل أنت متأكد من تفعيل حساب هذا الوكيل؟';

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.patch(`/agents/${agent.id}/status`, { status: newStatus });
      fetchAgents();
    } catch (err: any) {
      alert(err.messageAr || 'فشل تغيير حالة حساب الوكيل.');
    }
  };

  const columns = [
    {
      key: 'full_name_ar',
      label: ar.agents.fullNameAr,
      render: (row: Agent) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-primary-dark">{row.full_name_ar}</span>
          <span className="text-[10px] text-text-secondary font-mono">{row.username}</span>
        </div>
      )
    },
    {
      key: 'role',
      label: ar.agents.role,
      render: (row: Agent) => <span>{row.role.nameAr}</span>
    },
    {
      key: 'branch',
      label: ar.agents.branch,
      render: (row: Agent) => <span>{row.branch?.name_ar || '-'}</span>
    },
    {
      key: 'phone',
      label: ar.agents.phone,
      render: (row: Agent) => <span>{row.phone || '-'}</span>
    },
    {
      key: 'status',
      label: ar.agents.status,
      render: (row: Agent) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status === 'active' ? 'نشط' : 'موقف'}
        </Badge>
      )
    },
    {
      key: 'created_at',
      label: ar.common.created,
      render: (row: Agent) => <span>{formatDate(row.created_at)}</span>
    },
    {
      key: 'actions',
      label: ar.common.actions,
      cellAlign: 'center' as const,
      render: (row: Agent) => (
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
                    ? 'text-error border-error/30 hover:bg-error/5'
                    : 'text-success border-success/30 hover:bg-success/5'
                }`}
              >
                {row.status === 'active' ? 'إيقاف' : 'تفعيل'}
              </button>
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
          <h1 className="text-2xl font-bold text-primary-dark">{ar.agents.title}</h1>
          <p className="text-xs text-text-secondary">إدارة حسابات الوكلاء الماليين واللوجستيين وتعيين الفروع وتتبع المحافظ المالية</p>
        </div>

        {canWrite && (
          <Button
            variant="secondary"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            <span>➕</span>
            <span>{ar.agents.addAgent}</span>
          </Button>
        )}
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-lg border border-border shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">البحث النصي</label>
          <Input
            placeholder="البحث بالاسم أو اسم المستخدم..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">{ar.agents.branch}</label>
          <select
            value={branchFilter}
            onChange={(e) => {
              setBranchFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
          >
            <option value="">{ar.common.all}</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name_ar}</option>
            ))}
          </select>
        </div>

        <div className="text-right">
          <label className="text-[10px] text-text-secondary block mb-1 font-bold">{ar.agents.role}</label>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
          >
            <option value="">{ar.common.all}</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nameAr}</option>
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
            <option value="suspended">موقف</option>
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
          data={agents}
          isLoading={isLoading}
          onRowClick={(row) => openDetailModal(row)}
          emptyTitle="لا توجد حسابات وكلاء"
          emptyDescription="لم يتم العثور على أي وكلاء مسجلين يطابقون شروط البحث."
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
            صفحة {page} من {totalPages} ({totalItems} وكيل)
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
        title={ar.agents.addAgent}
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
              label="اسم المستخدم البرمجي (English)"
              id="agent_username"
              placeholder="e.g. basra_agent_1"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
            />
            <Input
              label={ar.agents.password}
              id="agent_password"
              type="password"
              placeholder="أدخل كلمة مرور قوية"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.agents.fullName}
              id="agent_fullname"
              placeholder="e.g. Ahmed Ali"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.agents.fullNameAr}
              id="agent_fullname_ar"
              placeholder="e.g. أحمد علي"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.agents.email}
              id="agent_email"
              type="email"
              placeholder="e.g. agent@example.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label={ar.agents.phone}
              id="agent_phone"
              placeholder="e.g. +9647800000000"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.agents.role}</label>
              <select
                value={formRoleId}
                onChange={(e) => setFormRoleId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
                required
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.nameAr}</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.agents.branch}</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
              >
                <option value="">لا يوجد فرع محدد</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={ar.agents.editAgent}
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
              label="اسم المستخدم البرمجي (English)"
              id="edit_agent_username"
              value={formUsername}
              onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
            />
            <Input
              label="كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)"
              id="edit_agent_password"
              type="password"
              value={formPassword}
              onChange={(e) => setFormPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.agents.fullName}
              id="edit_agent_fullname"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              required
            />
            <Input
              label={ar.agents.fullNameAr}
              id="edit_agent_fullname_ar"
              value={formFullNameAr}
              onChange={(e) => setFormFullNameAr(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={ar.agents.email}
              id="edit_agent_email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
            />
            <Input
              label={ar.agents.phone}
              id="edit_agent_phone"
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.agents.role}</label>
              <select
                value={formRoleId}
                onChange={(e) => setFormRoleId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
                required
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.nameAr}</option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <label className="text-xs font-bold text-text-primary block mb-1">{ar.agents.branch}</label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                className="w-full bg-white border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-accent"
              >
                <option value="">لا يوجد فرع محدد</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name_ar}</option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={ar.agents.detailTitle}
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsDetailOpen(false)}>
            إغلاق
          </Button>
        }
      >
        {selectedAgent && (
          <div className="flex flex-col gap-6 text-right">
            <div className="bg-bg-light/40 border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">اسم الوكيل بالعربية</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.full_name_ar}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">اسم المستخدم (Username)</span>
                <span className="text-xs font-semibold text-text-secondary">{selectedAgent.username}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.role}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.role.nameAr}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.branch}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.branch?.name_ar || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.phone}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.phone || '-'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.email}</span>
                <span className="text-xs font-mono font-semibold text-text-secondary">{selectedAgent.email || '-'}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.status}</span>
                <div>
                  <Badge variant={selectedAgent.status === 'active' ? 'success' : 'danger'}>
                    {selectedAgent.status === 'active' ? 'نشط' : 'موقف'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.assignedCustomersCount}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.customer_count}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-text-secondary">{ar.agents.activeVehiclesCount}</span>
                <span className="text-xs font-bold text-primary-dark">{selectedAgent.vehicle_count}</span>
              </div>
            </div>

            {/* Wallet balances read-only */}
            <div className="bg-primary-dark/5 border border-primary-dark/10 p-4 rounded-lg flex flex-col gap-3">
              <span className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">{ar.agents.walletBalance}</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-border text-center">
                  <span className="text-[10px] text-text-secondary block mb-1">الرصيد بالدولار</span>
                  <span className="text-sm font-bold font-mono text-success">{formatUSD(selectedAgent.wallet.balance_usd)}</span>
                </div>
                <div className="bg-white p-3 rounded border border-border text-center">
                  <span className="text-[10px] text-text-secondary block mb-1">الرصيد بالدينار</span>
                  <span className="text-sm font-bold font-mono text-success">{formatIQD(selectedAgent.wallet.balance_iqd)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AgentsList;
