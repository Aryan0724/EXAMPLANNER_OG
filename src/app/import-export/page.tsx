
'use client';

import { useContext } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MainSidebar } from '@/components/main-sidebar';
import { MainHeader } from '@/components/main-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileDown, UploadCloud, Database, Trash2, Sparkles, Users, Building, CalendarDays, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AllotmentContext } from '@/context/AllotmentContext';
import { DataContext } from '@/context/DataContext';
import { generateMockClassrooms, generateMockExamSchedule, generateMockInvigilators, generateMockStudents } from '@/lib/data';
import { createClassroom, Invigilator } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { generateMasterReport, generateInvigilatorDutyRoster, generateDateShiftWiseReport, generateVisualSeatPlanExcel } from '@/lib/report-generator';

const ImportItem = ({ title, format, onUpload }: { title: string, format: string[], onUpload?: (data: string) => void }) => {
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (onUpload) {
        onUpload(content);
      } else {
        toast({
          title: `Uploading ${title}...`,
          description: "Feature coming soon for this category. Using mock processing.",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <AccordionItem value={title}>
      <AccordionTrigger className="text-md font-medium hover:no-underline text-left">
        {title}
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a CSV file with the following columns:
        </p>
        <div className="text-sm font-mono bg-muted p-3 rounded-lg border border-primary/10">
          {format.join(', ')}
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${title}`}
          />
          <Label
            htmlFor={`file-upload-${title}`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
          >
            <UploadCloud className="mr-2 h-4 w-4" />
            Choose {title} CSV
          </Label>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};


export default function ImportExportPage() {
  const { toast } = useToast();
  const { fullAllotment } = useContext(AllotmentContext);
  const {
    students, classrooms, invigilators,
    setStudents, setClassrooms, setInvigilators, setExamSchedule
  } = useContext(DataContext);


  const handlePopulateMockData = () => {
    toast({ title: 'Populating Mock Data...', description: 'Sample data (except invigilators) has been loaded.' });
    setStudents(generateMockStudents());
    setClassrooms(generateMockClassrooms());
    setInvigilators([]); // Keep empty to allow manual testing
    setExamSchedule(generateMockExamSchedule());
  };

  const handleClearAllData = () => {
    toast({ title: 'Data Cleared', description: 'All local data has been cleared.' });
    setStudents([]);
    setClassrooms([]);
    setInvigilators([]);
    setExamSchedule([]);
  };

  const handleExportMasterReport = () => {
    if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Allotment Data',
        description: 'Please generate a full allotment from the Schedule page before exporting a report.',
      });
      return;
    }
    if (!students || !classrooms || !invigilators) {
      toast({
        variant: 'destructive',
        title: 'Data Not Loaded',
        description: 'Please wait for all data to load before exporting.',
      });
      return;
    }

    try {
      generateMasterReport(fullAllotment, students, classrooms, invigilators);
      toast({
        title: 'Report Generated',
        description: 'The master invigilation report has been downloaded.',
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'There was an error generating the report. Check the console for details.',
      });
    }
  };

  const handleExportDutyRoster = () => {
    if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Allotment Data',
        description: 'Please generate a full allotment from the Schedule page before exporting a roster.',
      });
      return;
    }
    if (!invigilators) {
      toast({
        variant: 'destructive',
        title: 'Data Not Loaded',
        description: 'Please wait for invigilator data to load before exporting.',
      });
      return;
    }

    try {
      generateInvigilatorDutyRoster(fullAllotment, invigilators);
      toast({
        title: 'Roster Generated',
        description: 'The invigilator duty roster has been downloaded.',
      });
    } catch (error) {
      console.error("Failed to generate roster:", error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'There was an error generating the roster. Check the console for details.',
      });
    }
  }

  const handleExportDateShiftWiseReport = () => {
    if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Allotment Data',
        description: 'Please generate a full allotment from the Schedule page before exporting.',
      });
      return;
    }

    try {
      generateDateShiftWiseReport(fullAllotment);
      toast({
        title: 'Report Generated',
        description: 'The Date & Shift-wise invigilation report has been downloaded.',
      });
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message || 'An error occurred during generation.',
      });
    }
  }

  const handleExportVisualPlan = () => {
    if (!fullAllotment || Object.keys(fullAllotment).length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Allotment Data',
        description: 'Please generate a full allotment first.',
      });
      return;
    }
    if (!classrooms) {
      toast({ variant: 'destructive', title: 'Data Missing', description: 'Classroom data not loaded.' });
      return;
    }

    try {
      generateVisualSeatPlanExcel(fullAllotment, classrooms);
      toast({
        title: 'Report Generated',
        description: 'Visual Seat Matrix has been downloaded.',
      });
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Error generating visual plan.',
      });
    }
  };

  const handleInvigilatorUpload = (csvData: string) => {
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const newInvigilators: Invigilator[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const inv: any = {};

        headers.forEach((header, index) => {
          if (header === 'isAvailable') {
            inv[header] = values[index]?.toLowerCase() === 'true';
          } else {
            inv[header] = values[index];
          }
        });

        // Ensure defaults for new fields if not in CSV
        inv.designation = inv.designation || 'Assistant Professor';
        inv.gender = inv.gender || 'Male';
        inv.unavailableSlots = [];
        inv.assignedDuties = [];

        if (inv.id && inv.name) {
          newInvigilators.push(inv as Invigilator);
        }
      }

      if (newInvigilators.length > 0) {
        setInvigilators(newInvigilators);
        toast({
          title: "Import Successful",
          description: `Loaded ${newInvigilators.length} invigilators into the system.`,
        });
      }
    } catch (error) {
      console.error("CSV Parse Error:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: "Check CSV format and try again.",
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
              <div className="grid gap-8">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-6 w-6 text-primary" />
                      <CardTitle>Mock Data Flooding</CardTitle>
                    </div>
                    <CardDescription>Individually flood categories with sample data for testing purposes.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Button variant="outline" className="h-20 flex-col gap-2 border-primary/20 hover:bg-primary/10" onClick={() => { setStudents(generateMockStudents()); toast({ title: "Students Flooded", description: "Random student records loaded." }); }}>
                        <Users className="h-5 w-5 text-blue-500" />
                        <span>Flood Students</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2 border-primary/20 hover:bg-primary/10" onClick={() => { setClassrooms(generateMockClassrooms()); toast({ title: "Rooms Flooded", description: "Building & Room data loaded." }); }}>
                        <Building className="h-5 w-5 text-amber-500" />
                        <span>Flood Rooms</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2 border-primary/20 hover:bg-primary/10" onClick={() => { setExamSchedule(generateMockExamSchedule()); toast({ title: "Schedule Flooded", description: "Time-slots & Subjects loaded." }); }}>
                        <CalendarDays className="h-5 w-5 text-emerald-500" />
                        <span>Flood Schedule</span>
                      </Button>
                      <Button variant="outline" className="h-20 flex-col gap-2 border-primary/20 hover:bg-primary/10" onClick={() => { setInvigilators(generateMockInvigilators()); toast({ title: "Staff Flooded", description: "Mock faculty records loaded." }); }}>
                        <UserCheck className="h-5 w-5 text-rose-500" />
                        <span>Flood Staff</span>
                      </Button>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-primary/10">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" className="text-destructive hover:bg-destructive/10">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Nuclear Reset (Clear All)
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will wipe EVERY category. You will lose any manual invigilator entries you've made.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearAllData} className="bg-destructive text-destructive-foreground">Yes, Wipe Everything</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
                        title="Department & Course Data"
                        format={['department_name', 'course_name']}
                      />
                      <ImportItem
                        title="Course, Semester & Subject Data"
                        format={['course_name', 'semester', 'subject_name', 'subject_code']}
                      />
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
                        format={['id', 'name', 'department', 'designation', 'gender', 'isAvailable']}
                        onUpload={handleInvigilatorUpload}
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
                    <Button onClick={handleExportMasterReport}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Generate Master Report (Excel)
                    </Button>
                    <Button onClick={handleExportDutyRoster}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Generate Duty Roster (Excel)
                    </Button>
                    <Button onClick={handleExportVisualPlan}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Visual Seat Matrix (Excel)
                    </Button>
                    <Button onClick={handleExportDateShiftWiseReport}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Date & Shift-wise Duties (Excel)
                    </Button>
                    <Button variant="secondary" disabled>
                      <FileDown className="mr-2 h-4 w-4" />
                      Student List (CSV)
                    </Button>
                    <Button variant="secondary" disabled>
                      <FileDown className="mr-2 h-4 w-4" />
                      Exclusion Report (CSV)
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
