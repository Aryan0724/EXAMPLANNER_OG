'use client';

import { useState, useMemo } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building, Search } from 'lucide-react';
import { CLASSROOMS } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';

export default function ClassroomsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredClassrooms = useMemo(() => {
    if (!searchQuery) {
      return CLASSROOMS;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return CLASSROOMS.filter(room =>
      room.id.toLowerCase().includes(lowercasedQuery) ||
      room.roomNo.toLowerCase().includes(lowercasedQuery) ||
      room.building.toLowerCase().includes(lowercasedQuery)
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
                        <Building className="h-6 w-6" />
                        <CardTitle>Classrooms</CardTitle>
                      </div>
                      <CardDescription>List of all classrooms available for examinations.</CardDescription>
                    </div>
                    <div className="w-full max-w-sm">
                      <Input
                        placeholder="Search by ID, Room No, Building..."
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
                          <TableHead>Room No.</TableHead>
                          <TableHead>Building</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Rows</TableHead>
                          <TableHead>Cols/Bench</TableHead>
                          <TableHead>Bench Capacity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClassrooms.map((room) => (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.id}</TableCell>
                            <TableCell>{room.roomNo}</TableCell>
                            <TableCell>{room.building}</TableCell>
                            <TableCell>{room.capacity}</TableCell>
                            <TableCell>{room.rows}</TableCell>
                            <TableCell>{room.columns}</TableCell>
                            <TableCell>{room.benchCapacity}</TableCell>
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
