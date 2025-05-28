
# PennyPincher by Neski: Personal Finance Tracker

PennyPincher is a comprehensive personal finance management application designed to help users track their expenses, manage income, set budgets, and achieve savings goals. It leverages Firebase for user authentication and data persistence, and Genkit for AI-powered features.

## Core Features:

### 1. User Authentication
   - **Sign Up, Login, Logout:** Secure user accounts powered by Firebase Authentication.
   - **Session Management:** Persistent login sessions.

### 2. Dashboard & Overview
   - **Financial Snapshot:** At-a-glance view of total monthly spending, budget status, total income, and net balance.
   - **Spending Charts:**
      - **Spending Overview:** Bar chart showing spending trends over the last few months.
      - **Category Spending Breakdown:** Pie chart visualizing spending distribution across main categories.
   - **Savings Goals Summary:** Quick view of progress towards top savings goals.
   - **Quick Actions:** Easy navigation to add expenses, set budgets, or manage categories.

### 3. Expense Management
   - **Manual Expense Input:** Detailed form to add expenses including description, amount, date, category (main & sub), currency, payment method, and subscription details (next due date).
   - **AI Category Suggestion:** Genkit-powered feature to suggest categories based on expense description.
   - **Expense Listing & Editing:** View all expenses chronologically, with options to edit or delete individual entries.
   - **Data Import/Export:**
      - **Import:** Upload expenses from CSV or Excel files, with automatic category and payment method mapping (and creation if new categories are in the file).
      - **Export:** Download all expenses to an Excel sheet.

### 4. Income Management
   - **Manual Income Input:** Form to add income entries with description, amount, date, currency, and income source.
   - **Income Listing & Editing:** View all income entries chronologically, with options to edit or delete.
   - **Data Import:** Upload income from CSV or Excel files, with income source mapping.

### 5. Budgeting
   - **Budget Goal Setting:** Create and manage budget goals for specific expense categories (including roll-up from sub-categories).
   - **Progress Tracking:** Visual progress bars show spending against budget limits.
   - **Category Expense Drilldown:** Clickable budget items link to a detailed view of all expenses within that category.

### 6. Savings Goals
   - **Goal Creation & Management:** Set up savings goals with name, target amount, current amount, target date (optional), notes, and an optional icon.
   - **Progress Visualization:** Track progress towards each goal with visual indicators.

### 7. Financial Organization & Categorization
   - **Category Management:**
      - Create, edit, and delete main expense categories and sub-categories.
      - Hierarchical category structure.
      - (Icon assignment is primarily via default seeding; UI for icon picking is a future enhancement).
   - **Payment Method Management:** Define and manage various payment methods (e.g., credit cards, bank accounts).
   - **Income Source Management:** Define and manage sources of income (e.g., salary, freelance).
   - **Multi-Currency Support:**
      - Manage multiple currencies (name, code, symbol).
      - Manually set exchange rates against a base currency.
      - Expenses and income can be recorded in different currencies.
      - Budgets and dashboard totals are calculated in the base currency.

### 8. Reporting & Analysis Tools
   - **Expense Filtering & Search:** Dedicated page to search and filter expenses by date range, category (main/sub), amount range, and payment method.
   - **Detailed Expense Views:**
      - **By Category:** View all expenses for a specific category (and its sub-categories), with time-based filters (week, month, year) and comparison to previous periods.
      - **By Payment Method:** View all expenses made with a specific payment method.
      - **By Month/Year:** Overview pages showing expenses for a selected month (with weekly breakdown) or year.

### 9. Application Settings
   - **Currency Management:** Add/edit currencies and set exchange rates.
   - **Data Management:** Options to clear specific types of user data from Firestore (e.g., clear all expenses, clear categories and re-seed defaults).
   - **Theme Customization:** Light and Dark mode support.

### 10. User Experience
    - **Responsive Design:** Mobile and tablet-friendly interface.
    - **Toast Notifications:** Feedback for user actions (e.g., data saved, errors).
    - **Intuitive Navigation:** Sidebar and contextual back buttons.

## Technology Stack:
   - **Frontend:** Next.js (App Router), React, TypeScript
   - **Styling:** Tailwind CSS, ShadCN UI Components
   - **Backend & Database:** Firebase (Authentication, Firestore)
   - **AI Features:** Google Genkit
   - **File Parsing:** `xlsx` (for Excel), `papaparse` (for CSV)
   - **Date Management:** `date-fns`
   - **Charting:** `recharts` (via ShadCN UI Charts)
   - **Form Management:** `react-hook-form` with `zod` for validation
