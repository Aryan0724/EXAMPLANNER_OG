import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-6 w-6" />
                    <CardTitle>Reports</CardTitle>
                  </div>
                  <CardDescription>Export detailed reports in various formats.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" />
                    Seat Plan (Excel)
                  </Button>
                  <Button variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" />
                    Student List (CSV)
                  </Button>
                  <Button variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" />
                    Invigilator Duty (Excel)
                  </Button>
                   <Button variant="secondary">
                    <FileDown className="mr-2 h-4 w-4" />
                    Admit Cards (PDF)
                  </Button>
                   <Button variant="secondary" className="text-destructive-foreground bg-destructive/90 hover:bg-destructive">
                    <FileDown className="mr-2 h-4 w-4" />
                    Conflict Log (Excel)
                  </Button>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
