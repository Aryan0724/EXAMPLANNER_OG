'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Telescope, GraduationCap, ChevronRight } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/data';

export default function ExplorerPage() {
  const departments = useMemo(() => {
    return DEPARTMENTS.map(dept => ({
      name: dept,
      id: encodeURIComponent(dept.toLowerCase().replace(/ /g, '-')),
    }));
  }, []);

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
                    <Telescope className="h-6 w-6" />
                    <CardTitle>Student & Subject Explorer</CardTitle>
                  </div>
                  <CardDescription>
                    Select a department to explore its courses and subjects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {departments.map(dept => (
                    <Link
                      key={dept.id}
                      href={`/settings/${dept.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <span className="text-lg font-medium">{dept.name}</span>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
