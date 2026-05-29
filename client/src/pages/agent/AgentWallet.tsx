import React, { useState, useEffect } from 'react';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useAuthStore } from '../../stores/authStore';
import { formatUSD, formatIQD } from '../../utils/formatCurrency';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface Wallet {
  id: string;
  agent_id: string;
  balance_usd: number;
  balance_iqd: number;
  status: 'active' | 'frozen';
  updated_at: string;
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
}

export const AgentWallet: React.FC = () => {
  const { user: currentUser } = useAuthStore();

  // Scoping check: senior_agent, junior_agent only
  const isAllowed =
    currentUser?.role.name === 'senior_agent' ||
    currentUser?.role.name === 'junior_agent' ||
    (currentUser && currentUser.role.level >= 4);

  if (!isAllowed) {
    return (
      <div className="bg-error/10 border border-error/20 p-6 rounded-lg text-right text-sm text-error font-semibold" dir="rtl">
        ⚠️ {ar.wallets.unauthorizedPage}
      </div>
    );
  }

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Filters
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [txCurrencyFilter, setTxCurrencyFilter] = useState('');
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch Wallet details
  const fetchWallet = async () => {
    if (!currentUser?.id) return;
    setWalletLoading(true);
    setWalletError(null);
    try {
      const response = await api.get(`/wallets/${currentUser.id}`);
      if (response.data?.success && response.data?.data) {
        setWallet(response.data.data);
      } else {
        setWalletError(ar.wallets.walletNotFound);
      }
    } catch (err: any) {
      setWalletError(err.response?.data?.error?.message_ar || ar.wallets.walletNotFound);
    } finally {
      setWalletLoading(false);
    }
  };

  // Fetch Transactions
  const fetchTransactions = async (pageNum = 1) => {
    if (!currentUser?.id) return;
    setTxLoading(true);
    setTxError(null);
    try {
      const params: any = {
        page: pageNum,
        limit: 15,
      };
      if (txTypeFilter) params.type = txTypeFilter;
      if (txCurrencyFilter) params.currency = txCurrencyFilter;
      if (txDateFrom) params.date_from = txDateFrom;
      if (txDateTo) params.date_to = txDateTo;

      const response = await api.get(`/wallets/${currentUser.id}/transactions`, { params });
      if (response.data?.success) {
        setTransactions(response.data.transactions || []);
        setTotalPages(response.data.pages || 1);
        setTotalItems(response.data.total || 0);
      } else {
        setTxError(ar.wallets.emptyTransactions);
      }
    } catch (err: any) {
      setTxError(err.response?.data?.error?.message_ar || 'حدث خطأ في تحميل سجل المعاملات المالية.');
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [currentUser?.id]);

  useEffect(() => {
    fetchTransactions(page);
  }, [currentUser?.id, page, txTypeFilter, txCurrencyFilter, txDateFrom, txDateTo]);

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
        <h1 className="text-2xl font-bold text-primary-dark">{ar.wallets.myWalletTitle}</h1>
        <p className="text-xs text-text-secondary">
          عرض الرصيد الحالي للمحفظة المالية وسجل العمليات المالية والخصومات.
        </p>
      </div>

      {walletError && (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-sm text-error select-none">
          ⚠️ {walletError}
        </div>
      )}

      {walletLoading ? (
        <div className="bg-white rounded-lg border border-border shadow-sm p-8">
          <LoadingSpinner label="جاري تحميل بيانات المحفظة..." />
        </div>
      ) : (
        wallet && (
          <div className="bg-white border border-border rounded-lg shadow-sm p-6 flex flex-col gap-4 select-none animate-fadeIn">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-secondary">صاحب المحفظة</span>
                <span className="text-base font-bold text-primary-dark">{currentUser?.fullNameAr || currentUser?.fullName}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-text-secondary">الحالة</span>
                {getStatusBadge(wallet.status)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-light/40 border border-border/60 p-4 rounded-lg text-center flex flex-col gap-1">
                <span className="text-xs text-text-secondary font-bold">{ar.wallets.usdBalance}</span>
                <span className="text-xl font-bold font-mono text-success">
                  {formatUSD(wallet.balance_usd)}
                </span>
              </div>
              <div className="bg-bg-light/40 border border-border/60 p-4 rounded-lg text-center flex flex-col gap-1">
                <span className="text-xs text-text-secondary font-bold">{ar.wallets.iqdBalance}</span>
                <span className="text-xl font-bold font-mono text-info">
                  {formatIQD(wallet.balance_iqd)}
                </span>
              </div>
            </div>
          </div>
        )
      )}

      {/* Transaction History Section */}
      <div className="bg-white border border-border rounded-lg shadow-sm p-4 select-none flex flex-col gap-4">
        <div className="flex flex-wrap justify-between items-center border-b border-border pb-3 gap-3">
          <h3 className="text-sm font-bold text-primary-dark">
            {ar.wallets.transactionHistoryTitle}
          </h3>

          {/* Filter controls */}
          <div className="flex flex-wrap gap-2 text-xs">
            <select
              value={txTypeFilter}
              onChange={(e) => { setTxTypeFilter(e.target.value); setPage(1); }}
              className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
            >
              <option value="">كل الأنواع</option>
              <option value="deposit">{ar.wallets.depositType}</option>
              <option value="deduction">{ar.wallets.deductionType}</option>
              <option value="adjustment">{ar.wallets.adjustmentType}</option>
            </select>

            <select
              value={txCurrencyFilter}
              onChange={(e) => { setTxCurrencyFilter(e.target.value); setPage(1); }}
              className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
            >
              <option value="">كل العملات</option>
              <option value="USD">USD</option>
              <option value="IQD">IQD</option>
            </select>

            <input
              type="date"
              value={txDateFrom}
              onChange={(e) => { setTxDateFrom(e.target.value); setPage(1); }}
              className="px-2 py-1 text-[11px] border border-border rounded bg-white text-text-primary focus:outline-none"
              placeholder="من تاريخ"
            />

            <input
              type="date"
              value={txDateTo}
              onChange={(e) => { setTxDateTo(e.target.value); setPage(1); }}
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
                    <th className="px-4 py-2">{ar.wallets.dateTime}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-text-primary">
                  {transactions.map((tx) => {
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
                        <td className="px-4 py-2 font-mono text-[10px] text-text-secondary">{formattedDate}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center border-t border-border/50 pt-3">
                <div className="text-[11px] text-text-secondary">
                  صفحة {page} من {totalPages} ({totalItems} عمليات)
                </div>
                <div className="flex gap-2">
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
    </div>
  );
};

export default AgentWallet;
