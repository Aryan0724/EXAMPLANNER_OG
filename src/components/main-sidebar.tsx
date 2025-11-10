'use client';

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

export function MainSidebar() {
  // In a real app, this would come from a router or state
  const activeItem = 'dashboard';

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
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={activeItem === 'dashboard'}
              tooltip="Dashboard"
            >
              <Link href="#">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Students">
              <Link href="#">
                <Users />
                <span>Students</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Classrooms">
              <Link href="#">
                <Building />
                <span>Classrooms</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Invigilators">
              <Link href="#">
                <UserCheck />
                <span>Invigilators</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Reports">
              <Link href="#">
                <FileText />
                <span>Reports</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
           <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help">
              <Link href="#">
                <CircleHelp />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link href="#">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
