'use client';

import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { ExamplannerLogo } from '@/components/icons/examplanner-logo';
import {
  LayoutDashboard,
  Users,
  Building,
  UserCheck,
  FileText,
  Telescope,
  CircleHelp,
  ShieldBan,
  Printer,
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
    { id: 'dashboard', href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'allotment', href: '/allotment', icon: Printer, label: 'Allotment' },
    { id: 'students', href: '/students', icon: Users, label: 'Students' },
    { id: 'classrooms', href: '/classrooms', icon: Building, label: 'Classrooms' },
    { id: 'invigilators', href: '/invigilators', icon: UserCheck, label: 'Invigilators' },
    { id: 'reports', href: '/reports', icon: FileText, label: 'Reports' },
    { id: 'settings', href: '/settings', icon: Telescope, label: 'Explorer' },
];

const helpMenuItems = [
    { id: 'help', href: '#', icon: CircleHelp, label: 'Help & Support' },
]

export function MainSidebar() {
  const pathname = usePathname();
  const activeItem = pathname.split('/')[1] || 'dashboard';

  return (
    <Sidebar className="no-print">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <ExamplannerLogo className="text-primary-foreground size-8" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-sidebar-foreground">Examplanner</h2>
            <p className="text-xs text-sidebar-foreground/70">Admin Panel</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map(item => (
             <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  asChild
                  isActive={activeItem === item.id || (item.id === 'settings' && activeItem === 'settings')}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
           {helpMenuItems.map(item => (
             <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild tooltip={item.label}>
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
           ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
