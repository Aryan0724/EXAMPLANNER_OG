'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Search } from 'lucide-react';
import { INVIGILATORS } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function InvigilatorsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredInvigilators = useMemo(() => {
    if (!searchQuery) {
      return INVIGILATORS;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return INVIGILATORS.filter(inv =>
      inv.id.toLowerCase().includes(lowercasedQuery) ||
      inv.name.toLowerCase().includes(lowercasedQuery) ||
      inv.department.toLowerCase().includes(lowercasedQuery)
    );
  }, [searchQuery]);

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
                   <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-6 w-6" />
                        <CardTitle>Invigilators</CardTitle>
                      </div>
                      <CardDescription>List of all invigilators available for duty.</CardDescription>
                    </div>
                     <div className="w-full max-w-sm">
                      <Input
                        placeholder="Search by ID, Name, Department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                        icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                   <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInvigilators.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-medium">{inv.id}</TableCell>
                              <TableCell>{inv.name}</TableCell>
                              <TableCell>{inv.department}</TableCell>
                              <TableCell>
                                {inv.isAvailable ? <Badge variant="secondary">Available</Badge> : <Badge variant="destructive">Unavailable</Badge>}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                   </div>
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
