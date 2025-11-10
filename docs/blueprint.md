# **App Name**: Examplanner

## Core Features:

- Data Import and Parsing: Load student, classroom, invigilator, and timetable data from Excel/CSV files.
- Automated Seat Allotment: Automatically assign students to classrooms and seats based on availability and debarment status, retaining the same seat for a student across all exams.
- Debarred Student Management: Identify debarred students and prevent seat allocation for them, reserving the seats without allocating a student.
- Invigilator Assignment: Assign available invigilators to classrooms, ensuring balanced workload distribution, while handling the automatic removal of invigilators based on unavailability.
- Report Generation: Generate and export detailed reports in Excel/CSV format, including exam seat plans, student seat lists, and invigilator schedules.
- Manual Override and Control Panel: Enable manual adjustments to seat assignments and invigilator allocation through an admin UI, which also includes department-wise filtering.
- AI-Powered Availability Suggestions: Uses a tool that learns availability patterns to suggest which classrooms/invigilators are best suited at a given time. Prioritizes non-disruptive exam placements.

## Style Guidelines:

- Primary color: Deep purple (#673AB7), inspired by the sophistication and intellectual nature of academic environments. It is neither too vibrant nor overly subdued, promoting focus.
- Background color: Light grey (#F0F0F0), offering a neutral backdrop that ensures readability and reduces eye strain.
- Accent color: Blue (#3F51B5) analogous to purple and different in brightness and saturation, it can guide the user to interactive elements and important information.
- Body and headline font: 'Inter', a sans-serif font for a clean, modern look suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying configuration files and system reports.
- Use minimalist, clear icons to represent actions and data categories (e.g., download, filter, department). Consistent style across the app.
- Subtle transitions for loading data and displaying reports to maintain user engagement without distraction. Examples include spinners during data fetching and gentle expanding/collapsing of sections.