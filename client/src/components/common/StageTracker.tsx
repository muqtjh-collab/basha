import React from 'react';
import type { VehicleStage, UserTrackingStage } from '../../types';
import { VEHICLE_STAGES, USER_TRACKING_STAGES } from '../../types';
import { get16StageLabel, get8StageLabel, get16StageIndex, get8StageIndex } from '../../utils/stageMapping';

export interface StageTrackerProps {
  currentStage: VehicleStage | UserTrackingStage;
  mode: 16 | 8;
  layout?: 'horizontal' | 'vertical';
  history?: Array<{
    stage: string;
    transitionedBy: string;
    notesAr?: string | null;
    createdAt: string;
  }>;
}

export const StageTracker: React.FC<StageTrackerProps> = ({
  currentStage,
  mode,
  layout = 'horizontal',
  history = []
}) => {
  const is16 = mode === 16;
  const stagesList = is16 ? VEHICLE_STAGES : USER_TRACKING_STAGES;
  const currentIndex = is16 
    ? get16StageIndex(currentStage as VehicleStage)
    : get8StageIndex(currentStage as UserTrackingStage);

  const getStageDate = (stageName: string) => {
    const entry = history.find(h => h.stage === stageName);
    if (!entry) return null;
    return new Date(entry.createdAt).toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'numeric'
    });
  };

  const getStageNotes = (stageName: string) => {
    const entry = history.find(h => h.stage === stageName);
    return entry?.notesAr || null;
  };

  if (layout === 'vertical') {
    return (
      <div className="flex flex-col gap-6 text-right py-4 w-full">
        {stagesList.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const label = is16 ? get16StageLabel(stage as VehicleStage) : get8StageLabel(stage as UserTrackingStage);
          const date = getStageDate(stage);
          const notes = getStageNotes(stage);

          return (
            <div key={stage} className="flex gap-4 relative">
              {/* Connector line */}
              {index < stagesList.length - 1 && (
                <div className={`absolute top-6 right-[11px] w-[2px] h-[calc(100%+16px)] z-0 ${
                  isCompleted ? 'bg-primary-accent' : 'bg-border'
                }`} />
              )}
              
              {/* Indicator Circle */}
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 border z-10 font-bold text-xs select-none transition-all duration-300 ${
                isCompleted 
                  ? 'bg-primary-accent border-primary-accent text-primary-dark shadow-sm' 
                  : isCurrent
                  ? 'bg-white border-primary-accent text-primary-accent ring-4 ring-primary-accent/20 animate-pulse'
                  : 'bg-white border-border text-text-secondary/40'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Stage Details */}
              <div className="flex flex-col gap-1 pb-2">
                <div className="flex items-center gap-3">
                  <span className={`font-semibold text-sm ${
                    isCurrent ? 'text-primary-accent text-base' : isFuture ? 'text-text-secondary/50' : 'text-text-primary'
                  }`}>
                    {label}
                  </span>
                  {date && (
                    <span className="text-xs text-text-secondary bg-bg-light px-2 py-0.5 rounded border border-border">
                      {date}
                    </span>
                  )}
                </div>
                {isCurrent && notes && (
                  <p className="text-xs font-medium text-primary-dark/80 bg-primary-accent/5 p-2 rounded border border-primary-accent/15 mt-1">
                    {notes}
                  </p>
                )}
                {!isCurrent && notes && (
                  <p className="text-xs text-text-secondary line-clamp-1">{notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal tracker for top panels (Admin detail, Agent desktop)
  // To avoid scrolling problems, horizontal uses a visual bar representation
  return (
    <div className="w-full bg-white p-6 rounded-lg border border-border shadow-sm">
      <div className="flex justify-between items-center relative z-10 w-full mb-4">
        {/* Connector line background */}
        <div className="absolute top-3 left-3 right-3 h-[3px] bg-border z-0" />
        
        {/* Active line width progress */}
        <div 
          className="absolute top-3 right-3 h-[3px] bg-primary-accent z-0 transition-all duration-500" 
          style={{
            left: `${100 - (currentIndex / (stagesList.length - 1)) * 100}%`
          }}
        />

        {stagesList.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const label = is16 ? get16StageLabel(stage as VehicleStage) : get8StageLabel(stage as UserTrackingStage);

          // For horizontal view in 16-stage, we only render standard dots and labels on hover to avoid text overlap,
          // or simple indicators. Let's make it fully responsive.
          return (
            <div key={stage} className="flex flex-col items-center gap-2 relative z-10 cursor-default group">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center border font-bold text-xs select-none transition-all duration-300 ${
                isCompleted 
                  ? 'bg-primary-accent border-primary-accent text-primary-dark shadow-sm' 
                  : isCurrent
                  ? 'bg-white border-primary-accent text-primary-accent ring-4 ring-primary-accent/20'
                  : 'bg-white border-border text-text-secondary/40'
              }`}>
                {isCompleted ? '✓' : index + 1}
              </div>

              {/* Label that shows up on hover or always for current */}
              <span className={`absolute -bottom-8 whitespace-nowrap text-xs transition-all duration-200 ${
                isCurrent 
                  ? 'opacity-100 font-bold text-primary-accent scale-105' 
                  : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Spacer to account for absolute positioned labels */}
      <div className="h-6" />
      
      {/* Current stage indicator box below */}
      <div className="flex items-center justify-between mt-2 pt-4 border-t border-border">
        <span className="text-xs text-text-secondary font-medium">المرحلة الحالية:</span>
        <span className="text-sm font-bold text-primary-dark bg-primary-accent/10 border border-primary-accent/20 px-3 py-1 rounded-md">
          {is16 ? get16StageLabel(currentStage as VehicleStage) : get8StageLabel(currentStage as UserTrackingStage)}
        </span>
      </div>
    </div>
  );
};
export default StageTracker;
