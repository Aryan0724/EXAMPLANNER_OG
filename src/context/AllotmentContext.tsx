'use client';

import React, { createContext, useState } from 'react';
import type { SeatPlan, InvigilatorAssignment } from '@/lib/types';

interface AllotmentContextType {
  fullAllotment: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null;
  setFullAllotment: (allotment: Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null) => void;
}

export const AllotmentContext = createContext<AllotmentContextType>({
  fullAllotment: null,
  setFullAllotment: () => {},
});

export const AllotmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [fullAllotment, setFullAllotment] = useState<Record<string, { seatPlan: SeatPlan, invigilatorAssignments: InvigilatorAssignment[] }> | null>(null);

  return (
    <AllotmentContext.Provider value={{ fullAllotment, setFullAllotment }}>
      {children}
    </AllotmentContext.Provider>
  );
};
