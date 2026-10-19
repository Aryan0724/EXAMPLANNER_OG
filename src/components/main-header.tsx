'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck2, ShieldCheck, Sparkles } from 'lucide-react';

const routeTitles: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'manual-allotment': 'Faculty Shift Allotment',
  'allotment': 'Examination Allotment Hub',
  'schedule': 'Exam Schedule',
  'invigilators': 'Faculty & Invigilators',
  'classrooms': 'Classrooms & Venues',
  'students': 'Students Roster',
  'import-export': 'Import & Export Data',
};

export function MainHeader() {
  const pathname = usePathname();
  const segment = pathname.split('/')[1] || '';
  const currentTitle = routeTitles[segment] || 'Examination System';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 backdrop-blur-md px-4 md:px-8 no-print shadow-xs">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="hover:text-primary transition-colors text-xs md:text-sm font-medium">
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-xs md:text-sm text-foreground">
                {currentTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border text-xs text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">GEHU Bhimtal</span>
          <span className="text-muted-foreground/60">|</span>
          <span>May 2026 Session</span>
        </div>

        {segment !== 'allotment' && (
          <Link
            href="/allotment"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all shadow-xs"
          >
            <Sparkles className="size-3.5" />
            Allotment Hub
          </Link>
        )}
      </div>
    </header>
  );
}
