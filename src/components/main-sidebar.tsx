
'use client';

import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ExamplannerLogo } from '@/components/icons/examplanner-logo';
import {
  LayoutDashboard,
  Users,
  Building,
  UserCheck,
  CalendarCheck2,
  CalendarDays,
  Upload,
  Armchair,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  id: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Duty & Allotment',
    items: [
      {
        id: 'manual-allotment',
        href: '/manual-allotment',
        icon: CalendarCheck2,
        label: 'Faculty Shift Allotment',
        badge: 'Core',
        badgeColor: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
      },
      {
        id: 'allotment',
        href: '/allotment',
        icon: Armchair,
        label: 'Seating & Room Plan',
      },
      {
        id: 'schedule',
        href: '/schedule',
        icon: CalendarDays,
        label: 'Exam Schedule',
      },
    ],
  },
  {
    label: 'Campus Resources',
    items: [
      { id: 'invigilators', href: '/invigilators', icon: UserCheck, label: 'Faculty & Invigilators' },
      { id: 'classrooms', href: '/classrooms', icon: Building, label: 'Classrooms & Venues' },
      { id: 'students', href: '/students', icon: Users, label: 'Students Roster' },
    ],
  },
  {
    label: 'Data & Settings',
    items: [
      { id: 'import-export', href: '/import-export', icon: Upload, label: 'Import / Export' },
    ],
  },
];

export function MainSidebar() {
  const pathname = usePathname();
  const currentSegment = pathname.split('/')[1] || 'dashboard';

  return (
    <Sidebar className="no-print border-r border-sidebar-border/40">
      <SidebarHeader className="p-4 pb-3 border-b border-sidebar-border/30">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2 rounded-xl bg-white/10 group-hover:bg-white/15 transition-colors shadow-sm">
            <ExamplannerLogo className="text-white size-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-sidebar-foreground">Examplanner</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-white/15 text-sidebar-foreground/90">GEHU</span>
            </div>
            <p className="text-[11px] text-sidebar-foreground/70">Bhimtal Examination Center</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 space-y-4">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            <SidebarGroupLabel className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = currentSegment === item.id;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                        className={`h-10 rounded-lg px-3 transition-all ${
                          isActive
                            ? 'bg-white/20 text-white font-semibold shadow-sm'
                            : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Link href={item.href} className="flex items-center gap-3">
                          <Icon className={`size-4 shrink-0 ${isActive ? 'text-white' : 'text-sidebar-foreground/70'}`} />
                          <span className="text-sm truncate">{item.label}</span>
                          {item.badge && (
                            <span
                              className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
                                item.badgeColor || 'bg-white/15 text-white border-white/20'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border/30">
        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs text-sidebar-foreground/75">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-[11px]">Even Sem May 2026</span>
          </div>
          <span className="text-[10px] text-sidebar-foreground/50">v2.4</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
