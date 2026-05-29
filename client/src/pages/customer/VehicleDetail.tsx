import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ar } from '../../locale/ar';
import { USER_TRACKING_STAGE_MAP } from '../../locale/constants';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { formatDate } from '../../utils/formatDate';

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

interface TimelineEntry {
  user_tracking_stage_label: string;
  created_at: string;
}

interface PhotoEntry {
  id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

export const VehicleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [timelineLoading, setTimelineLoading] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);

  const fetchVehicle = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/customer/vehicles/${id}`);
      setVehicle(res.data.data);
    } catch (err: any) {
      // If unauthorized (e.g. cross-access), redirect to dashboard with error message
      if (err.status === 403) {
        navigate('/customer', { replace: true });
        // Trigger a custom notification or alert in the parent layout context
        return;
      }
      setError(err.messageAr || 'حدث خطأ في تحميل تفاصيل المركبة.');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  const fetchTimeline = useCallback(async () => {
    if (!id) return;
    setTimelineLoading(true);
    try {
      const res = await api.get(`/customer/vehicles/${id}/timeline`);
      setTimeline(res.data.data);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setTimelineLoading(false);
    }
  }, [id]);

  const fetchPhotos = useCallback(async () => {
    if (!id) return;
    setPhotosLoading(true);
    try {
      const res = await api.get(`/customer/vehicles/${id}/photos`);
      setPhotos(res.data.data);
    } catch (err) {
      console.error('Failed to fetch photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchVehicle();
    fetchTimeline();
    fetchPhotos();
  }, [fetchVehicle, fetchTimeline, fetchPhotos]);

  if (isLoading) {
    return <LoadingSpinner label={ar.common.loading} />;
  }

  if (error || !vehicle) {
    return (
      <div className="flex flex-col gap-4 text-right select-none">
        <div className="bg-error/10 border border-error/20 p-4 rounded-xl text-xs text-error font-semibold">
          ⚠️ {error || 'المركبة المطلوبة غير موجودة في النظام.'}
        </div>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => navigate('/customer')}>
          {ar.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-right select-none animate-none">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h1 className="text-sm font-bold text-primary-dark">
          {vehicle.make ? `${vehicle.make} ${vehicle.model || ''} (${vehicle.year || ''})` : 'تفاصيل المركبة'}
        </h1>
        <Button variant="outline" size="sm" onClick={() => navigate('/customer')}>
          {ar.common.back}
        </Button>
      </div>

      {/* 1. Shipment Status Card */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
        <h2 className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
          {ar.customerPortal.shipmentStatus}
        </h2>
        <div className="bg-primary-accent/5 border border-primary-accent/15 rounded-lg p-4 text-center flex flex-col gap-1">
          <span className="text-lg font-bold text-primary-accent">
            {USER_TRACKING_STAGE_MAP[vehicle.user_tracking_stage] || vehicle.user_tracking_stage_label}
          </span>
          <span className="text-[10px] text-text-secondary">الحالة الحالية لتتبع المركبة</span>
        </div>
      </div>

      {/* 2. Vehicle Information Card */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
        <h2 className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
          مواصفات السيارة
        </h2>
        <div className="grid grid-cols-1 gap-2.5 text-xs">
          <div className="flex justify-between items-center py-1.5 border-b border-border/40">
            <span className="text-text-secondary">{ar.customerPortal.vin}</span>
            <span className="font-mono font-bold text-primary-dark" dir="ltr">{vehicle.vin}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border/40">
            <span className="text-text-secondary">{ar.customerPortal.color}</span>
            <span className="font-bold text-primary-dark">{vehicle.color_ar || vehicle.color || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border/40">
            <span className="text-text-secondary">{ar.customerPortal.year}</span>
            <span className="font-bold text-primary-dark">{vehicle.year || '-'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-text-secondary">{ar.customerPortal.auction}</span>
            <span className="font-bold text-primary-accent uppercase">{vehicle.auction_source || '-'}</span>
          </div>
        </div>
      </div>

      {/* 3. Shipping Milestones timeline */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <h2 className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
          {ar.customerPortal.timelineTitle}
        </h2>

        {timelineLoading ? (
          <LoadingSpinner label={ar.common.loading} />
        ) : timeline.length === 0 ? (
          <p className="text-xs text-text-secondary py-2 text-center">{ar.customerPortal.emptyTimeline}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timeline.map((entry, idx) => (
              <div key={idx} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-accent border border-white mt-1 shadow-sm" />
                  {idx < timeline.length - 1 && (
                    <div className="w-px flex-1 bg-border/60 mt-1" />
                  )}
                </div>
                <div className="flex-1 bg-bg-light/35 border border-border/40 rounded-lg p-2.5 mb-2 text-xs flex justify-between items-center gap-2">
                  <span className="font-bold text-primary-dark">{entry.user_tracking_stage_label}</span>
                  <span className="text-[10px] text-text-secondary font-mono">{formatDate(entry.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Vehicle Photos Grid */}
      <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col gap-3">
        <h2 className="text-xs font-bold text-primary-dark border-r-4 border-primary-accent pr-2">
          {ar.customerPortal.photosTitle}
        </h2>

        {photosLoading ? (
          <LoadingSpinner label={ar.common.loading} />
        ) : photos.length === 0 ? (
          <div className="text-center py-6 text-xs text-text-secondary bg-bg-light/10 rounded-lg border border-dashed border-border select-none">
            📷 {ar.customerPortal.emptyPhotos}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-1">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={`/${photo.file_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative border border-border rounded-lg overflow-hidden bg-bg-light/20 aspect-video flex items-center justify-center shadow-sm hover:shadow transition-all duration-150"
              >
                <img
                  src={`/${photo.file_url}`}
                  alt={photo.file_name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                  onError={(e) => {
                    // Fallback to text box if image fails to render
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <span className="absolute bottom-0 left-0 right-0 bg-primary-dark/80 text-white text-[8px] p-1 text-center truncate font-mono">
                  {photo.file_name}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default VehicleDetail;
