import React, { useState, useEffect } from 'react';
import { ar } from '../../locale/ar';
import { api } from '../../services/api';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Pagination } from '../../components/common/Pagination';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: any | null;
  newValue: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    fullNameAr: string;
    username: string | null;
  } | null;
}

export const AuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [searchUser, setSearchUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // UI state for expandable row
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    try {
      const params: any = {
        page,
        limit: 25
      };

      if (selectedAction) params.action = selectedAction;
      if (selectedEntity) params.entity_type = selectedEntity;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      // Note: search by user is done by filtering local results if needed, or query parameter
      // We will search locally or let API handle it. Let's send user_id if we have a way,
      // otherwise, we can filter locally or search locally based on name.
      // Let's implement local text search over the returned results or pass query parameter.
      // If we pass user_id, since the search is by name string, let's filter locally
      // to keep it simple or implement client-side filtering. Let's filter on the client
      // for the user text, or send a general query. Let's implement local text filter to make it responsive!

      const response = await api.get('/audit-log', { params });
      const { logs: logData, totalCount: count, totalPages: pages } = response.data.data;
      
      setLogs(logData);
      setTotalCount(count);
      setTotalPages(pages);
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.messageAr || 'حدث خطأ في تحميل سجل التدقيق.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, selectedAction, selectedEntity, dateFrom, dateTo]);

  const handleResetFilters = () => {
    setSearchUser('');
    setSelectedAction('');
    setSelectedEntity('');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    fetchLogs(1);
  };

  const translateAction = (action: string): string => {
    const actions: Record<string, string> = {
      create: 'إضافة / إنشاء',
      update: 'تعديل بيانات',
      delete: 'حذف سجل',
      login: 'تسجيل دخول',
      logout: 'تسجيل خروج',
      stage_transition: 'ترفيع شحنة',
      wallet_operation: 'حركة مالية',
      status_change: 'تغيير حالة الحساب'
    };
    return actions[action] || action;
  };

  const getActionBadgeClass = (action: string): string => {
    switch (action) {
      case 'create': return 'bg-success/15 text-success border border-success/30';
      case 'update': return 'bg-primary-accent/15 text-primary-dark border border-primary-accent/30';
      case 'delete': return 'bg-error/15 text-error border border-error/30';
      case 'login': return 'bg-primary-dark/10 text-primary-dark border border-primary-dark/20';
      case 'logout': return 'bg-bg-light border border-border text-text-secondary';
      case 'stage_transition': return 'bg-info/15 text-info border border-info/30';
      case 'wallet_operation': return 'bg-warning/15 text-warning border border-warning/30';
      default: return 'bg-bg-light border border-border text-text-primary';
    }
  };

  const translateEntity = (entity: string): string => {
    const entities: Record<string, string> = {
      vehicle: 'سيارة / شحنة',
      user: 'مستخدم',
      role: 'دور وصلاحيات',
      wallet: 'محفظة مالية',
      receipt: 'إيصال مالي',
      customer: 'عميل',
      session: 'جلسة مستخدم'
    };
    return entities[entity] || entity;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('ar-IQ', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter logs locally based on searchUser (matching fullNameAr or username)
  const filteredLogs = logs.filter(log => {
    if (!searchUser) return true;
    const name = log.user?.fullNameAr || log.user?.fullName || 'النظام';
    const username = log.user?.username || '';
    return name.toLowerCase().includes(searchUser.toLowerCase()) || 
           username.toLowerCase().includes(searchUser.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 text-right select-none">
        <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.auditLog}</h1>
        <p className="text-xs text-text-secondary">
          سجل النشاطات والأحداث التفصيلي المجرى في النظام من قبل الموظفين والنظام (إجمالي العمليات الموثقة: {totalCount})
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-border p-4 rounded-lg shadow-sm flex flex-col gap-4 select-none">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* User Search */}
          <Input
            label="البحث بالمستخدم"
            id="search_user"
            placeholder="اسم الموظف أو المستخدم"
            value={searchUser}
            onChange={(e) => setSearchUser(e.target.value)}
          />

          {/* Action Filter */}
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-text-secondary">نوع الإجراء</label>
            <select
              value={selectedAction}
              onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:border-primary-accent"
            >
              <option value="">كل الإجراءات</option>
              <option value="create">إنشاء / إضافة</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
              <option value="login">تسجيل دخول</option>
              <option value="logout">تسجيل خروج</option>
              <option value="stage_transition">ترفيع شحنة</option>
              <option value="wallet_operation">عملية مالية</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-text-secondary">نوع السجل</label>
            <select
              value={selectedEntity}
              onChange={(e) => { setSelectedEntity(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 text-xs border border-border rounded bg-white text-text-primary focus:outline-none focus:border-primary-accent"
            >
              <option value="">كل السجلات</option>
              <option value="vehicle">المركبات</option>
              <option value="user">المستخدمين</option>
              <option value="role">الأدوار والصلاحيات</option>
              <option value="wallet">المحافظ المالية</option>
              <option value="receipt">الإيصالات</option>
              <option value="customer">العملاء</option>
            </select>
          </div>

          {/* Date From */}
          <Input
            label="من تاريخ"
            id="date_from"
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
          />

          {/* Date To */}
          <Input
            label="إلى تاريخ"
            id="date_to"
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="font-bold text-xs">
            إعادة تعيين الفلاتر
          </Button>
        </div>
      </div>

      {/* Main Logs Table */}
      {errorMsg ? (
        <div className="bg-error/10 border border-error/20 p-4 rounded-lg text-right text-sm text-error">
          ⚠️ {errorMsg}
        </div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg border border-border shadow-sm p-12">
          <LoadingSpinner label="جاري جلب سجل النشاطات والتعديلات..." />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-lg border border-border shadow-sm p-12 text-center flex flex-col items-center gap-2">
          <span className="text-4xl">📥</span>
          <h3 className="text-base font-bold text-text-primary">لا توجد سجلات تدقيق مطابقة</h3>
          <p className="text-xs text-text-secondary">لم يتم العثور على أي نشاطات مسجلة تطابق محددات البحث والفلاتر الحالية.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="w-full overflow-hidden bg-white rounded-lg border border-border shadow-sm select-none">
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-max table-auto border-collapse text-right">
                <thead>
                  <tr className="bg-primary-dark text-white text-xs font-semibold border-b border-border">
                    <th className="px-5 py-3">التاريخ والوقت</th>
                    <th className="px-5 py-3">المستخدم المنفذ</th>
                    <th className="px-5 py-3">نوع العملية</th>
                    <th className="px-5 py-3">نوع السجل</th>
                    <th className="px-5 py-3">رقم معرف السجل</th>
                    <th className="px-5 py-3 text-center">التفاصيل التعديلية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs text-text-primary">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedRowId === log.id;
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedRowId(isExpanded ? null : log.id)}
                          className={`hover:bg-bg-light/40 transition-colors cursor-pointer ${
                            isExpanded ? 'bg-bg-light/60 font-semibold' : ''
                          }`}
                        >
                          <td className="px-5 py-3 font-mono">{formatDate(log.createdAt)}</td>
                          <td className="px-5 py-3 font-bold text-primary-dark">
                            {log.user?.fullNameAr || log.user?.fullName || 'النظام'}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getActionBadgeClass(log.action)}`}>
                              {translateAction(log.action)}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-medium">{translateEntity(log.entityType)}</td>
                          <td className="px-5 py-3 font-mono text-[10px] text-text-secondary select-all">
                            {log.entityId.substring(0, 8)}...
                          </td>
                          <td className="px-5 py-3 text-center font-bold text-[10px] text-primary-accent">
                            {isExpanded ? '▲ إخفاء' : '▼ عرض التفاصيل'}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-bg-light/20 border-t border-border">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex flex-col gap-4 max-w-full overflow-x-auto p-4 bg-white border border-border rounded-lg shadow-sm">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-text-secondary">القيم السابقة الموثقة (Old Value):</span>
                                    {log.oldValue ? (
                                      <pre className="text-[11px] font-mono bg-bg-light/30 p-3 rounded overflow-x-auto text-left leading-normal" dir="ltr">
                                        {JSON.stringify(log.oldValue, null, 2)}
                                      </pre>
                                    ) : (
                                      <span className="text-[10px] text-text-secondary italic">لا توجد قيم سابقة مسجلة (عملية إنشاء)</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-bold text-text-secondary">القيم الجديدة الموثقة (New Value):</span>
                                    {log.newValue ? (
                                      <pre className="text-[11px] font-mono bg-bg-light/30 p-3 rounded overflow-x-auto text-left leading-normal" dir="ltr">
                                        {JSON.stringify(log.newValue, null, 2)}
                                      </pre>
                                    ) : (
                                      <span className="text-[10px] text-text-secondary italic">لا توجد قيم جديدة مسجلة (عملية حذف)</span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[9px] text-text-secondary border-t border-border/50 pt-2 font-mono" dir="ltr">
                                  <span>Log ID: {log.id}</span>
                                  <span>Target Entity ID: {log.entityId}</span>
                                  <span>Client IP: {log.ipAddress || 'N/A'}</span>
                                  <span>User Agent: {log.userAgent || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditLog;
