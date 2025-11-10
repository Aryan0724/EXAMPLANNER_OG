import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building } from 'lucide-react';
import { CLASSROOMS } from '@/lib/data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ClassroomsPage() {
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
                    <Building className="h-6 w-6" />
                    <CardTitle>Classrooms</CardTitle>
                  </div>
                  <CardDescription>List of all classrooms available for examinations.</CardDescription>
                </CardHeader>
                <CardContent>
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
                      {CLASSROOMS.map((room) => (
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
                </CardContent>
              </Card>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
