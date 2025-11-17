
'use client';

import { useState, useMemo, useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, Search } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { DataContext } from '@/context/DataContext';

export default function InvigilatorExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { invigilators } = useContext(DataContext);

  const filteredInvigilators = useMemo(() => {
    let invigilatorsToFilter = invigilators;

    if (departmentFilter !== 'all') {
      invigilatorsToFilter = invigilatorsToFilter.filter(inv => inv.department === departmentFilter);
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      invigilatorsToFilter = invigilatorsToFilter.filter(inv =>
        inv.id.toLowerCase().includes(lowercasedQuery) ||
        inv.name.toLowerCase().includes(lowercasedQuery)
      );
    }
    
    return invigilatorsToFilter;
  }, [searchQuery, departmentFilter, invigilators]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="mb-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink href="/settings">Explorer</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>Invigilators</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              <Card>
                <CardHeader>
                   <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-6 w-6" />
                        <CardTitle>Invigilator Explorer</CardTitle>
                      </div>
                      <CardDescription>Search and filter all invigilators.</CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="w-full max-w-xs">
                           <Select onValueChange={setDepartmentFilter} defaultValue="all">
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {DEPARTMENTS.map(dep => (
                                        <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full max-w-sm">
                          <Input
                            placeholder="Search by ID or Name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                            icon={<Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />}
                          />
                        </div>
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
                   {filteredInvigilators.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                          No invigilators found for this filter.
                      </div>
                    )}
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
