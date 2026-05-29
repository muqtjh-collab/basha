import React from 'react';
import { ar } from '../../locale/ar';
import Card from '../../components/common/Card';

export const Dashboard: React.FC = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5 text-right select-none">
        <h1 className="text-2xl font-bold text-primary-dark">{ar.nav.dashboard}</h1>
        <p className="text-xs text-text-secondary">مرحباً بك في لوحة تحكم الوكيل لمتابعة الشحنات</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title={ar.dashboard.myActiveVehicles} value="5" icon="🚗" description="سيارات قيد الشحن والمتابعة" />
        <Card title={ar.dashboard.myWalletBalance} value="$15,500.00" icon="💼" description="رصيدي بالدولار الأمريكي" />
        <Card title={ar.dashboard.pendingReceipts} value="1" icon="🧾" description="إيصالات قيد مراجعة الإدارة" />
      </div>
    </div>
  );
};
export default Dashboard;
