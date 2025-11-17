
'use client';

import { useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileDown, UploadCloud, Database, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DataContext } from '@/context/DataContext';
import { generateMockClassrooms, generateMockExamSchedule, generateMockInvigilators, generateMockStudents } from '@/lib/data';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const ImportItem = ({ title, format }: { title: string, format: string[] }) => {
  const { toast } = useToast();

  const handleUpload = () => {
    toast({
      title: `Uploading ${title}...`,
      description: "This is a mock-up. In a real app, the file would be processed here.",
    });
  };

  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-md font-medium hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with the following columns:
          </p>
          <div className="text-sm font-mono bg-muted p-2 rounded-md">
            {format.join(', ')}
          </div>
          <Button variant="outline" onClick={handleUpload}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload {title} File
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


export default function ImportExportPage() {
  const { toast } = useToast();
  const { setStudents, setClassrooms, setInvigilators, setExamSchedule } = useContext(DataContext);

  const handleExport = (reportName: string) => {
    toast({
      title: `Generating ${reportName} Report...`,
      description: "This is a mock-up. In a real app, a file would be downloaded.",
    });
  };

  const handlePopulateMockData = () => {
    setStudents(generateMockStudents());
    setClassrooms(generateMockClassrooms());
    setInvigilators(generateMockInvigilators());
    setExamSchedule(generateMockExamSchedule());
    toast({
      title: 'Mock Data Populated',
      description: 'The application has been filled with sample data.',
    });
  };

  const handleClearAllData = () => {
    setStudents([]);
    setClassrooms([]);
    setInvigilators([]);
    setExamSchedule([]);
    toast({
      title: 'All Data Cleared',
      description: 'All master data has been removed from the application.',
      variant: 'destructive',
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <div className="flex flex-col h-full">
            <MainHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
               <div className="grid gap-8">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                        <Database className="h-6 w-6" />
                        <CardTitle>Data Management</CardTitle>
                        </div>
                        <CardDescription>Use these actions to populate the application with sample data for demonstration or clear all data to start fresh.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handlePopulateMockData}>
                            <Database className="mr-2 h-4 w-4" />
                            Populate Mock Data
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Clear All Data
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all student, classroom, invigilator, and schedule data from the application.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearAllData}>Yes, clear all data</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                    </CardContent>
                </Card>

                 <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UploadCloud className="h-6 w-6" />
                      <CardTitle>Data Import</CardTitle>
                    </div>
                    <CardDescription>Upload your master data files in CSV format. The system will process the files to update the database. Click on an item to see the required format and upload.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <ImportItem 
                        title="Student Data"
                        format={['id', 'name', 'rollNo', 'department', 'course', 'semester', 'section', 'group']}
                      />
                      <ImportItem 
                        title="Exam Schedule"
                        format={['id', 'date', 'time', 'course', 'department', 'semester', 'subjectName', 'subjectCode', 'duration', 'group']}
                      />
                       <ImportItem 
                        title="Classroom Data"
                        format={['id', 'roomNo', 'building', 'rows', 'columns', 'benchCapacities', 'departmentBlock']}
                      />
                       <ImportItem 
                        title="Invigilator Data"
                        format={['id', 'name', 'department', 'isAvailable']}
                      />
                    </Accordion>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FileText className="h-6 w-6" />
                      <CardTitle>Report Generation</CardTitle>
                    </div>
                    <CardDescription>Export detailed reports and logs from the generated allotment data in various formats.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Button variant="secondary" onClick={() => handleExport('Seat Plan (Excel)')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Seat Plan (Excel)
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('Student List (CSV)')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Student List (CSV)
                    </Button>
                    <Button variant="secondary" onClick={() => handleExport('Invigilator Duty (Excel)')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Invigilator Duty (Excel)
                    </Button>
                     <Button variant="secondary" onClick={() => handleExport('Admit Cards (PDF)')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Admit Cards (PDF)
                    </Button>
                     <Button variant="secondary" className="text-destructive-foreground bg-destructive/90 hover:bg-destructive" onClick={() => handleExport('Conflict Log (Excel)')}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Conflict Log (Excel)
                    </Button>
                  </CardContent>
                </Card>
               </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
