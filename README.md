# 🎓 Examplanner | GEHU Exam Management System

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Radix UI](https://img.shields.io/badge/Radix_UI-Latest-6E3CBC?style=for-the-badge&logo=radix-ui)](https://www.radix-ui.com/)

**Examplanner** is a robust, full-stack examination management solution specifically tailored for **Graphic Era Hill University (GEHU)**. It streamlines the complex process of scheduling exams, allocating seating arrangements, and managing invigilator duties with precision and efficiency.

---

## 🚀 Key Features

-   **📅 Smart Exam Scheduling**: Automated multi-shift scheduling (4 shifts/day) with deterministic logic to ensure balanced subject distribution.
-   **🪑 Automated Seating Arrangement**: Intelligent seat allocation based on classroom grid layouts, bench capacities, and student group constraints.
-   **👨‍🏫 Invigilator Duty Management**: Sophisticated duty assignment system utilizing real GEHU faculty data, tracking session limits and department-wise availability.
-   **📄 Robust Data Import/Export**: seamless integration with existing university systems via PDF and Excel (XLSX) parsing and generation.
-   **🏢 Venue Management**: Detailed classroom and laboratory tracking including building-wise blocks (Block C, D, E, etc.) and specific bench-wise capacities.
-   **🚫 Ineligibility & Debarment Tracking**: Integrated handling for student eligibility, debarment reasons, and disciplinary records.
-   **📊 Admin Dashboard**: A premium, responsive command center for real-time overview of the examination lifecycle.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Shadcn UI](https://ui.shadcn.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
-   **Data Visualization**: [Recharts](https://recharts.org/)
-   **Document Processing**: `exceljs`, `jspdf`, `pdfjs-dist`
-   **Backend/DB**: [Supabase](https://supabase.com/) (Migrations included)

---

## 📁 Project Structure

```text
src/
├── app/              # Next.js App Router (Pages & API)
├── components/       # Reusable UI components & Layouts
│   ├── ui/           # Radix-based primitive components
│   └── icons/        # Custom SVG icons including Examplanner logo
├── lib/              # Core business logic & Utilities
│   ├── planning.ts   # Seating & Duty allocation algorithms
│   ├── data.ts       # Mock data & GEHU constants (Departments, Faculty)
│   ├── types.ts      # TypeScript interfaces for the domain model
│   └── report-gen.ts # PDF/Excel generation logic
└── styles/           # Global CSS and Tailwind configurations
```

---

## 🚦 Getting Started

### Prerequisites

-   Node.js (v18.x or later)
-   npm / bun / pnpm

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/gehu-examplanner.git
    cd gehu-examplanner
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the results.

---

## 📝 Configuration

The project uses Supabase for persistent data. Ensure you run the migrations found in the `supabase/migrations` directory:

1.  Locate `RUN_THIS_IN_SUPABASE.sql`.
2.  Execute the script in your Supabase SQL Editor.
3.  Configure your environment variables in a `.env.local` file (refer to `.env.example` if available).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for feature requests and bug reports.

---

## 📄 License

This project is developed for GEHU administrative purposes. All rights reserved.

---
*Built with ❤️ for GEHU by Aryan Tiwari.*
