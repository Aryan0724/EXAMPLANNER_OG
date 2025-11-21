
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
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ExamplannerLogo } from '@/components/icons/examplanner-logo';
import {
  LayoutDashboard,
  Users,
  Building,
  UserCheck,
  Telescope,
  CircleHelp,
  Printer,
  CalendarDays,
  Upload,
  ChevronDown,
  ShieldOff,
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
    { id: 'dashboard', href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'schedule', href: '/schedule', icon: CalendarDays, label: 'Schedule' },
    { id: 'allotment', href: '/allotment', icon: Printer, label: 'Allotment' },
    { id: 'students', href: '/students', icon: Users, label: 'Students' },
    { id: 'classrooms', href: '/classrooms', icon: Building, label: 'Classrooms' },
    { id: 'invigilators', href: '/invigilators', icon: UserCheck, label: 'Invigilators' },
    { id: 'import-export', href: '/import-export', icon: Upload, label: 'Import / Export' },
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
           <SidebarMenuItem>
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton 
                    isActive={activeItem === 'settings'}
                    className="w-full justify-between"
                  >
                     <div className="flex items-center gap-2">
                        <Telescope/>
                        <span>Explorer</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform [&[data-state=open]]:-rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                     <SidebarMenuItem>
                        <SidebarMenuSubButton asChild isActive={pathname === '/settings/invigilators'}>
                           <Link href="/settings/invigilators">
                              <UserCheck />
                              <span>Invigilators</span>
                           </Link>
                        </SidebarMenuSubButton>
                     </SidebarMenuItem>
                     <SidebarMenuItem>
                        <SidebarMenuSubButton asChild isActive={pathname === '/settings/unavailability'}>
                           <Link href="/settings/unavailability">
                              <ShieldOff />
                              <span>Unavailability</span>
                           </Link>
                        </SidebarMenuSubButton>
                     </SidebarMenuItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
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
