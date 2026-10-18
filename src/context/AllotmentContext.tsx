'use client';

import React, { createContext, useState, useEffect } from 'react';
import type { SeatPlan, InvigilatorAssignment } from '@/lib/types';

interface AllotmentContextType {
  fullAllotment: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null;
  setFullAllotment: React.Dispatch<React.SetStateAction<Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null>>;
}

export const AllotmentContext = createContext<AllotmentContextType>({
  fullAllotment: null,
  setFullAllotment: () => { },
});

export const ALLOTMENT_STORAGE_KEY = 'gehu_full_allotment_v8_rules';

export const AllotmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [fullAllotment, setFullAllotmentState] = useState<Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null>(null);

  useEffect(() => {
    try {
      // Invalidate and remove outdated pre-fix allotment cache
      ['gehu_full_allotment', 'gehu_full_allotment_v5', 'gehu_full_allotment_v6', 'gehu_full_allotment_v7_rules'].forEach(k => {
        if (localStorage.getItem(k)) localStorage.removeItem(k);
      });
      const saved = localStorage.getItem(ALLOTMENT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setFullAllotmentState(parsed);
        }
      }
    } catch (err) {}
  }, []);

  const setFullAllotment = (valOrFn: React.SetStateAction<Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null>) => {
    setFullAllotmentState(prev => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      try {
        if (next && Object.keys(next).length > 0) {
          localStorage.setItem(ALLOTMENT_STORAGE_KEY, JSON.stringify(next));
        } else {
          localStorage.removeItem(ALLOTMENT_STORAGE_KEY);
        }
        localStorage.removeItem('gehu_full_allotment');
      } catch (err) {}
      return next;
    });
  };

  return (
    <AllotmentContext.Provider value={{ fullAllotment, setFullAllotment }}>
      {children}
    </AllotmentContext.Provider>
  );
};
