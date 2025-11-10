import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { DashboardClient } from '@/components/dashboard-client';

export default function Home() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <DashboardClient />
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
