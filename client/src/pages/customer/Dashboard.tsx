import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ar } from '../../locale/ar';
import { useAuth } from '../../hooks/useAuth';
import { USER_TRACKING_STAGE_MAP } from '../../locale/constants';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';

interface Vehicle {
  id: string;
  vin: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  color_ar: string | null;
  lot_number: string | null;
  auction_source: string | null;
  user_tracking_stage: string;
  user_tracking_stage_label: string;
  status: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get('/customer/vehicles');
        setVehicles(response.data.data);
      } catch (err: any) {
        setError(err.messageAr || ar.customerPortal.errorState);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  if (isLoading) {
    return <LoadingSpinner label={ar.common.loading} />;
  }

  return (
    <div className="flex flex-col gap-4 text-right select-none animate-none">
      {/* Welcome Banner & Logout */}
      <div className="bg-white border border-border p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-text-secondary">{ar.customerPortal.greeting}</span>
          <span className="text-sm font-bold text-primary-dark">
            {user?.fullNameAr || user?.fullName || ''}
          </span>
        </div>
        <button
          onClick={() => logout()}
          className="text-xs font-bold text-error border border-error/25 hover:bg-error/5 px-3 py-1.5 rounded-lg transition-all duration-150"
        >
          {ar.nav.logout}
        </button>
      </div>

      <div className="flex flex-col gap-1 select-none">
        <h2 className="text-sm font-bold text-primary-dark border-r-4 border-primary-accent pr-2 mb-1">
          {ar.customerPortal.myVehicles}
        </h2>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 p-3 rounded-lg text-xs text-error font-semibold">
          ⚠️ {error}
        </div>
      )}

      {!error && vehicles.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white rounded-xl border border-border text-xs text-text-secondary select-none">
          📭 {ar.customerPortal.emptyState}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => navigate(`/customer/vehicles/${v.id}`)}
              className="bg-white p-4 rounded-xl border border-border hover:border-primary-accent/40 shadow-sm hover:shadow-md cursor-pointer flex flex-col gap-3 transition-all duration-200"
            >
              {/* Car title & status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-primary-dark">
                    {v.make ? `${v.make} ${v.model || ''} (${v.year || ''})` : 'سيارة'}
                  </span>
                  <span className="text-[9px] font-mono text-text-secondary">VIN: {v.vin}</span>
                </div>
                <Badge variant={v.status === 'delivered' ? 'gray' : 'success'}>
                  {USER_TRACKING_STAGE_MAP[v.user_tracking_stage] || v.user_tracking_stage_label}
                </Badge>
              </div>

              {/* Specs & info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs border-t border-border/40 pt-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-secondary">{ar.customerPortal.color}</span>
                  <span className="font-semibold text-primary-dark">{v.color_ar || v.color || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-text-secondary">{ar.vehicles.lotNumber}</span>
                  <span className="font-mono text-text-secondary">{v.lot_number || '-'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Dashboard;
