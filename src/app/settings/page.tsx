
'use client';

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Settings, List, PlusCircle } from 'lucide-react';
import { DEPARTMENTS as initialDepartments } from '@/lib/data';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [departments, setDepartments] = useState<string[]>(initialDepartments);
  const [newDepartment, setNewDepartment] = useState('');

  const handleAddDepartment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDepartment && !departments.includes(newDepartment)) {
      setDepartments([...departments, newDepartment]);
      setNewDepartment('');
      toast({
        title: 'Department Added',
        description: `"${newDepartment}" has been added to the list.`,
      });
    } else {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: `Department "${newDepartment}" is invalid or already exists.`,
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              <div className="space-y-8">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Settings className="h-6 w-6" />
                      <CardTitle>Application Settings</CardTitle>
                    </div>
                    <CardDescription>Manage core application data like departments, courses, and subjects.</CardDescription>
                  </CardHeader>
                </Card>

                <Card>
                  <CardHeader>
                     <div className="flex items-center gap-2">
                      <List className="h-5 w-5" />
                      <CardTitle className="text-xl">Departments</CardTitle>
                    </div>
                    <CardDescription>View and add new academic departments.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 rounded-md border p-4">
                      {departments.map((dept, index) => (
                        <li key={index} className="text-sm">
                          {dept}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                   <CardFooter>
                     <form onSubmit={handleAddDepartment} className="flex w-full items-center space-x-2">
                        <Input
                            type="text"
                            value={newDepartment}
                            onChange={(e) => setNewDepartment(e.target.value)}
                            placeholder="Enter new department name"
                        />
                        <Button type="submit" variant="secondary">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Department
                        </Button>
                    </form>
                   </CardFooter>
                </Card>
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
