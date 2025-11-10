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
  Settings,
  CircleHelp,
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
    { id: 'dashboard', href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'students', href: '/students', icon: Users, label: 'Students' },
    { id: 'classrooms', href: '/classrooms', icon: Building, label: 'Classrooms' },
    { id: 'invigilators', href: '/invigilators', icon: UserCheck, label: 'Invigilators' },
    { id: 'reports', href: '/reports', icon: FileText, label: 'Reports' },
];

const helpMenuItems = [
    { id: 'help', href: '#', icon: CircleHelp, label: 'Help & Support' },
    { id: 'settings', href: '#', icon: Settings, label: 'Settings' },
]

export function MainSidebar() {
  const pathname = usePathname();
  const activeItem = pathname.substring(1) || 'dashboard';

  return (
    <Sidebar>
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
                  isActive={activeItem === item.id}
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
