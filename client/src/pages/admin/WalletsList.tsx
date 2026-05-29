import React, { useState, useEffect } from 'react';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import Badge from '../../components/common/Badge';
import { useAuthStore } from '../../stores/authStore';
import { formatUSD, formatIQD } from '../../utils/formatCurrency';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

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
    id: string | null;
    balance_usd: number;
    balance_iqd: number;
    status: 'active' | 'frozen';
  };
}

interface Transaction {
  id: string;
  wallet_id: string;
  type: 'deposit' | 'deduction' | 'adjustment';
  amount: number;
  currency: 'USD' | 'IQD';
  description: string;
  description_ar: string;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string;
  created_at: string;
  performer: {
    full_name: string;
    full_name_ar: string;
  } | null;
}

export const WalletsList: React.FC = () => {
  const { user: currentUser } = useAuthStore();

  // Scoping Check
  const isAllowed =
    currentUser?.role.name === 'super_admin' ||
    currentUser?.role.name === 'operations_manager' ||
    (currentUser?.role?.level ?? 99) <= 2;

  if (!isAllowed) {
    return (
      <div className="bg-error/10 border border-error/20 p-6 rounded-lg text-right text-sm text-error font-semibold" dir="rtl">
        ⚠️ {ar.wallets.unauthorizedPage}
      </div>
    );
  }

  // State lists
  const [agents, setAgents] = useState<Agent[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination for Wallets Table
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Selected Agent & Wallet Operations Panel
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // Operations Form State
  const [operationType, setOperationType] = useState<'deposit' | 'deduct' | null>(null);
  const [formAmount, setFormAmount] = useState('');
  const [formCurrency, setFormCurrency] = useState<'USD' | 'IQD'>('USD');
  const [formDesc, setFormDesc] = useState('');
  const [formDescAr, setFormDescAr] = useState('');
  const [formRefType, setFormRefType] = useState('');
  const [formRefId, setFormRefId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txCurrencyFilter, setTxCurrencyFilter] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  // Fetch Agents/Wallets
  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/agents', {
        params: {
          search: search || undefined,
          branch_id: branchFilter || undefined,
          page,
          limit: 10,
        },
      });

      // Filter by wallet status on the client-side if a wallet status filter is set
      let fetchedAgents: Agent[] = response.data.data;
      if (statusFilter) {
        fetchedAgents = fetchedAgents.filter((a) => a.wallet?.status === statusFilter);
      }

      setAgents(fetchedAgents);
      setTotalItems(response.data.pagination.total);
      setTotalPages(response.data.pagination.pages);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message_ar || 'حدث خطأ في تحميل المحافظ المالية.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Branches
  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.data);
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // Fetch Transactions for selected agent
  const fetchTransactions = async (agentId: string, pageNum = 1) => {
    setTxLoading(true);
    try {
      const params: any = {
        page: pageNum,
        limit: 10,
      };
      if (txTypeFilter) params.type = txTypeFilter;
      if (txCurrencyFilter) params.currency = txCurrencyFilter;
      if (txDateFrom) params.date_from = txDateFrom;
      if (txDateTo) params.date_to = txDateTo;

      const response = await api.get(`/wallets/${agentId}/transactions`, { params });
      setTransactions(response.data.transactions);
      setTxTotalPages(response.data.pages);
      setTxError(null);
    } catch (err: any) {
      setTxError(err.response?.data?.error?.message_ar || 'حدث خطأ في تحميل سجل العمليات.');
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [page, search, branchFilter, statusFilter]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchTransactions(selectedAgent.id, txPage);
    }
  }, [selectedAgent, txPage, txTypeFilter, txCurrencyFilter, txDateFrom, txDateTo]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setOperationType(null);
    setFormAmount('');
    setFormDesc('');
    setFormDescAr('');
    setFormRefType('');
    setFormRefId('');
    setFormError(null);
    setFormSuccess(null);
    setTxPage(1);
    setTxTypeFilter('');
    setTxCurrencyFilter('');
    setTxDateFrom('');
    setTxDateTo('');
  };

  // Handle Wallet Operations Submission
  const handleOperationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    setFormError(null);
    setFormSuccess(null);

    // Front-end validness checking
    const parsedAmount = Number(formAmount);
    if (!formAmount || isNaN(parsedAmount) || !Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setFormError(ar.wallets.invalidAmount);
      return;
    }

    if (!formDesc.trim() || !formDescAr.trim()) {
      setFormError(ar.wallets.descriptionRequired);
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = `/wallets/${selectedAgent.id}/${operationType === 'deposit' ? 'deposit' : 'deduct'}`;
      const payload: any = {
        amount: parsedAmount,
        currency: formCurrency,
        description: formDesc,
        description_ar: formDescAr,
      };

      if (formRefType) payload.reference_type = formRefType;
      if (formRefId) payload.reference_id = formRefId;

      const response = await api.post(endpoint, payload);

      setFormSuccess(ar.wallets.successMessage);
      setFormAmount('');
      setFormDesc('');
      setFormDescAr('');
      setFormRefType('');
      setFormRefId('');

      // Refresh data
      fetchWallets();
      
      // Update selected agent's wallet balances locally
      if (response.data.success && response.data.data) {
        setSelectedAgent((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            wallet: {
              ...prev.wallet,
              balance_usd: response.data.data.balance_usd,
              balance_iqd: response.data.data.balance_iqd,
            },
          };
        });
      }

      // Refresh transactions
      fetchTransactions(selectedAgent.id, 1);
    } catch (err: any) {
      setFormError(err.response?.data?.error?.message_ar || 'فشلت العملية. يرجى التحقق من المدخلات.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: 'active' | 'frozen') => {
    if (status === 'frozen') {
      return <Badge variant="danger">{ar.wallets.frozen}</Badge>;
    }
    return <Badge variant="success">{ar.wallets.active}</Badge>;
  };

  const getTxTypeBadge = (type: 'deposit' | 'deduction' | 'adjustment') => {
    switch (type) {
      case 'deposit':
        return <Badge variant="success">{ar.wallets.depositType}</Badge>;
      case 'deduction':
        return <Badge variant="danger">{ar.wallets.deductionType}</Badge>;
      default:
        return <Badge variant="warning">{ar.wallets.adjustmentType}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-1 select-none">
        <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.wallets}</h1>
        <p className="text-xs text-text-secondary">
          إدارة الأرصدة المالية لوكلاء شحن شركة الباشا للاستيراد، وتسجيل حركات الإيداع والخصم يدوياً.
        </p>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white border border-border p-4 rounded-lg shadow-sm flex flex-col gap-4 select-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label="اسم الوكيل"
            id="wallet_search"
            placeholder={ar.wallets.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-text-secondary">{ar.wallets.branchFilter}</label>
            <select
              value={branchFilter}
              onChange={(e) => { setBranchFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:border-primary-accent"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-text-secondary">{ar.wallets.statusFilter}</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:border-primary-accent"
            >
              <option value="">كل الحالات</option>
              <option value="active">{ar.wallets.active}</option>
              <option value="frozen">{ar.wallets.frozen}</option>
            </select>
          </div>

          <div className="flex items-end justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setBranchFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="font-bold text-xs"
            >
              إعادة تعيين الفلاتر
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Split: Wallets List Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${selectedAgent ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-4`}>
          {errorMsg && (
            <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-sm text-error">
              ⚠️ {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="bg-white rounded-lg border border-border shadow-sm p-12">
              <LoadingSpinner label="جاري جلب المحافظ المالية للوكلاء..." />
            </div>
          ) : agents.length === 0 ? (
            <div className="bg-white rounded-lg border border-border shadow-sm p-12 text-center flex flex-col items-center gap-2">
              <span className="text-4xl">💼</span>
              <h3 className="text-base font-bold text-text-primary">{ar.wallets.emptyWallets}</h3>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-border shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-max table-auto border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-primary-dark text-white font-semibold border-b border-border">
                      <th className="px-4 py-3">{ar.wallets.agentName}</th>
                      <th className="px-4 py-3">{ar.wallets.branch}</th>
                      <th className="px-4 py-3">{ar.wallets.usdBalance}</th>
                      <th className="px-4 py-3">{ar.wallets.iqdBalance}</th>
                      <th className="px-4 py-3">{ar.wallets.status}</th>
                      <th className="px-4 py-3 text-center">{ar.wallets.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-text-primary">
                    {agents.map((agent) => (
                      <tr
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className={`hover:bg-bg-light/40 transition-colors cursor-pointer ${
                          selectedAgent?.id === agent.id ? 'bg-bg-light font-semibold border-r-4 border-primary-accent' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-bold text-primary-dark">{agent.full_name_ar}</td>
                        <td className="px-4 py-3">{agent.branch?.name_ar || '-'}</td>
                        <td className="px-4 py-3 font-mono">{formatUSD(agent.wallet?.balance_usd)}</td>
                        <td className="px-4 py-3 font-mono">{formatIQD(agent.wallet?.balance_iqd)}</td>
                        <td className="px-4 py-3">{getStatusBadge(agent.wallet?.status || 'active')}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAgent(agent);
                            }}
                            className="px-2 py-1 rounded bg-primary-accent/15 text-primary-dark font-bold text-[10px]"
                          >
                            إدارة العمليات ➔
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-border p-3 flex justify-between items-center select-none">
                  <div className="flex gap-1 text-[11px] text-text-secondary">
                    <span>صفحة {page} من {totalPages}</span>
                    <span>({totalItems} وكلاء)</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Wallet Details & Form Panel */}
        {selectedAgent && (
          <div className="lg:col-span-5 flex flex-col gap-6 select-none animate-fadeIn">
            {/* Wallet Info Panel */}
            <div className="bg-white border border-border rounded-lg shadow-sm p-4 flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-sm font-bold text-primary-dark">{selectedAgent.full_name_ar}</h3>
                  <span className="text-[10px] text-text-secondary">{selectedAgent.branch?.name_ar || 'بدون فرع'}</span>
                </div>
                {getStatusBadge(selectedAgent.wallet?.status || 'active')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-bg-light/40 border border-border/60 p-3 rounded text-center">
                  <span className="text-[10px] text-text-secondary block font-bold mb-1">{ar.wallets.usdBalance}</span>
                  <span className="text-sm font-bold font-mono text-success block">
                    {formatUSD(selectedAgent.wallet?.balance_usd)}
                  </span>
                </div>
                <div className="bg-bg-light/40 border border-border/60 p-3 rounded text-center">
                  <span className="text-[10px] text-text-secondary block font-bold mb-1">{ar.wallets.iqdBalance}</span>
                  <span className="text-sm font-bold font-mono text-info block">
                    {formatIQD(selectedAgent.wallet?.balance_iqd)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={operationType === 'deposit' ? 'primary' : 'outline'}
                  className="flex-1 font-bold text-xs py-2"
                  onClick={() => {
                    setOperationType('deposit');
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  disabled={selectedAgent.wallet?.status === 'frozen'}
                >
                  ➕ {ar.wallets.depositTitle}
                </Button>
                <Button
                  variant={operationType === 'deduct' ? 'danger' : 'outline'}
                  className="flex-1 font-bold text-xs py-2"
                  onClick={() => {
                    setOperationType('deduct');
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  disabled={selectedAgent.wallet?.status === 'frozen'}
                >
                  ➖ {ar.wallets.deductTitle}
                </Button>
              </div>
            </div>

            {/* Selected Operation Form */}
            {operationType && (
              <form
                onSubmit={handleOperationSubmit}
                className="bg-white border border-border rounded-lg shadow-sm p-4 flex flex-col gap-3 animate-slideDown"
              >
                <h4 className="text-xs font-bold text-primary-dark border-b border-border pb-2 mb-1">
                  {operationType === 'deposit' ? 'إجراء عملية إيداع' : 'إجراء عملية خصم'}
                </h4>

                {formError && (
                  <div className="bg-error/10 border border-error/20 p-2.5 rounded text-[11px] text-error font-medium">
                    ⚠️ {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="bg-success/15 border border-success/30 p-2.5 rounded text-[11px] text-success font-medium">
                    ✓ {formSuccess}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`${ar.wallets.amount} (${formCurrency === 'USD' ? 'بالسنت' : 'بالفلس'})`}
                    id="op_amount"
                    type="number"
                    placeholder="مثال: 1500"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                  />

                  <div className="flex flex-col gap-1.5 text-right">
                    <label className="text-xs font-bold text-text-secondary">{ar.wallets.currency}</label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value as 'USD' | 'IQD')}
                      className="px-3 py-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:border-primary-accent"
                    >
                      <option value="USD">دولار أمريكي (USD)</option>
                      <option value="IQD">دينار عراقي (IQD)</option>
                    </select>
                  </div>
                </div>

                <Input
                  label={ar.wallets.description}
                  id="op_desc"
                  placeholder="e.g. Manual cash top-up"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  required
                />

                <Input
                  label={ar.wallets.descriptionAr}
                  id="op_desc_ar"
                  placeholder="مثال: شحن رصيد يدوي نقدي"
                  value={formDescAr}
                  onChange={(e) => setFormDescAr(e.target.value)}
                  required
                />

                <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2">
                  <Input
                    label="نوع المرجع (اختياري)"
                    id="op_ref_type"
                    placeholder="مثال: receipt"
                    value={formRefType}
                    onChange={(e) => setFormRefType(e.target.value)}
                  />
                  <Input
                    label="معرف المرجع (UUID اختياري)"
                    id="op_ref_id"
                    placeholder="أدخل معرف UUID"
                    value={formRefId}
                    onChange={(e) => setFormRefId(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-border pt-3 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOperationType(null)}
                    disabled={isSubmitting}
                  >
                    {ar.wallets.cancel}
                  </Button>
                  <Button
                    type="submit"
                    variant={operationType === 'deposit' ? 'primary' : 'danger'}
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'جاري التنفيذ...' : operationType === 'deposit' ? ar.wallets.submitDeposit : ar.wallets.submitDeduct}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Transaction History Section for selected Agent */}
      {selectedAgent && (
        <div className="bg-white border border-border rounded-lg shadow-sm p-4 select-none flex flex-col gap-4">
          <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
            <h3 className="text-sm font-bold text-primary-dark">
              {ar.wallets.transactionHistoryTitle} (الوكيل: {selectedAgent.full_name_ar})
            </h3>

            {/* Filter controls */}
            <div className="flex flex-wrap gap-2 text-xs">
              <select
                value={txTypeFilter}
                onChange={(e) => { setTxTypeFilter(e.target.value); setTxPage(1); }}
                className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
              >
                <option value="">كل الأنواع</option>
                <option value="deposit">{ar.wallets.depositType}</option>
                <option value="deduction">{ar.wallets.deductionType}</option>
                <option value="adjustment">{ar.wallets.adjustmentType}</option>
              </select>

              <select
                value={txCurrencyFilter}
                onChange={(e) => { setTxCurrencyFilter(e.target.value); setTxPage(1); }}
                className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
              >
                <option value="">كل العملات</option>
                <option value="USD">USD</option>
                <option value="IQD">IQD</option>
              </select>

              <input
                type="date"
                value={txDateFrom}
                onChange={(e) => { setTxDateFrom(e.target.value); setTxPage(1); }}
                className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
                placeholder="من تاريخ"
              />

              <input
                type="date"
                value={txDateTo}
                onChange={(e) => { setTxDateTo(e.target.value); setTxPage(1); }}
                className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
                placeholder="إلى تاريخ"
              />
            </div>
          </div>

          {txError ? (
            <div className="bg-error/10 border border-error/20 p-4 rounded text-xs text-error">
              ⚠️ {txError}
            </div>
          ) : txLoading ? (
            <div className="p-12 text-center text-xs text-text-secondary font-semibold">
              <LoadingSpinner label="جاري جلب سجل المعاملات المالية..." />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-secondary italic">
              {ar.wallets.emptyTransactions}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-max table-auto border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-primary-dark/5 text-primary-dark font-bold border-b border-border">
                      <th className="px-4 py-2">{ar.wallets.type}</th>
                      <th className="px-4 py-2">{ar.wallets.amount}</th>
                      <th className="px-4 py-2">{ar.wallets.currency}</th>
                      <th className="px-4 py-2">{ar.wallets.description}</th>
                      <th className="px-4 py-2">{ar.wallets.performer}</th>
                      <th className="px-4 py-2">{ar.wallets.dateTime}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-text-primary">
                    {transactions.map((tx) => {
                      // Note: deductions are stored as negative numbers in DB
                      const absAmount = Math.abs(tx.amount);
                      const displayAmount = tx.currency === 'USD' ? formatUSD(absAmount) : formatIQD(absAmount);
                      
                      const rawDate = new Date(tx.created_at);
                      const formattedDate = rawDate.toLocaleString('ar-IQ', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      });

                      return (
                        <tr key={tx.id} className="hover:bg-bg-light/35 transition-colors">
                          <td className="px-4 py-2">{getTxTypeBadge(tx.type)}</td>
                          <td className={`px-4 py-2 font-bold font-mono ${tx.type === 'deposit' ? 'text-success' : 'text-error'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{displayAmount}
                          </td>
                          <td className="px-4 py-2 font-mono">{tx.currency}</td>
                          <td className="px-4 py-2">{tx.description_ar || tx.description}</td>
                          <td className="px-4 py-2 text-primary-dark font-medium">
                            {tx.performer?.full_name_ar || tx.performer?.full_name || 'النظام'}
                          </td>
                          <td className="px-4 py-2 font-mono text-[10px] text-text-secondary">{formattedDate}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Transactions Pagination */}
              {txTotalPages > 1 && (
                <div className="flex justify-end gap-2 border-t border-border/50 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={txPage <= 1}
                    onClick={() => setTxPage((p) => p - 1)}
                  >
                    السابق
                  </Button>
                  <span className="text-[11px] text-text-secondary flex items-center px-2">
                    صفحة {txPage} من {txTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={txPage >= txTotalPages}
                    onClick={() => setTxPage((p) => p + 1)}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletsList;
