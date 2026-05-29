import React from 'react';
import { ar } from '../../locale/ar';
import Card from '../../components/common/Card';

export const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-right select-none">
        <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.dashboard}</h1>
        <p className="text-xs text-text-secondary">مرحباً بك في لوحة تحكم شركة الباشا للاستيراد</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title={ar.dashboard.totalVehicles} value="20" icon="🚗" description="سيارات نشطة في النظام" />
        <Card title={ar.dashboard.totalAgents} value="4" icon="👥" description="وكلاء شحن معتمدين" />
        <Card title={ar.dashboard.totalCustomers} value="10" icon="🤝" description="عملاء مسجلين" />
        <Card title={ar.dashboard.totalBalances} value="$48,600.00" icon="💼" description="أرصدة محافظ الوكلاء" />
      </div>
    </div>
  );
};
export default Dashboard;
