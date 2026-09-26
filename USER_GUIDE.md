# Leaner User Guide

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Login & First-Time Setup](#2-login--first-time-setup)
3. [Student Features](#3-student-features)
4. [Teacher & Assistant Features](#4-teacher--assistant-features)
5. [Admin Features](#5-admin-features)
6. [User Management (Admins)](#6-user-management-admins)
7. [Batch Import Users](#7-batch-import-users)
8. [Course Management](#8-course-management)
9. [Verifier System](#9-verifier-system)

---

## 1. System Overview

Leaner is a formal verification learning platform for mathematical proofs using Lean 4. It allows:
- **Students** to practice Lean proofs, submit answers, and receive grades
- **Teachers/TAs** to create exercises, grade submissions, and manage courses
- **Admins** to manage users, courses, and system settings

### Access
- **Web URL**: `http://<your-server-ip>:3000` (self-hosted — see `docs/DEVOPS_GUIDE.md` for deployment)
- **Verifier**: optional — enable the verifier profile for automated Lean 4 checking

---

## 2. Login & First-Time Setup

### Login Page

The login page supports two authentication modes:

1. **Student ID** (default) — for students created via batch import
2. **Email** — for existing admin/teacher accounts

Toggle between them using the **Student ID / Email** buttons.

### First Login Flow

1. Admin creates your account with a **Student ID** (e.g., `2024000001`)
2. Your initial password is your **Student ID**
3. On first login, you will be forced to **change your password**
4. Enter a new password (min 6 characters), confirm it, then continue to the dashboard

> **Note**: Self-registration is disabled. Accounts can only be created by an administrator.

### Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access: manage users, courses, exercises, grades, system settings |
| **Teacher** | Create/manage courses and exercises, grade submissions |
| **Assistant (TA)** | Grade submissions, assist with course management |
| **Student** | View courses, submit answers, view grades |

---

## 3. Student Features

### Dashboard
After logging in, you see the main dashboard with your enrolled courses.

### Courses
- Browse available courses under **Courses** in the sidebar
- Click a course to view its content: assignments, posts, notifications

### Exercises
- Browse the exercise bank under **Exercises**
- Filter by title, tags, or difficulty level
- Click an exercise to view details and submit answers
- Submit **informal** (natural language) and **formal** (Lean 4 code) answers
- Save as **draft** or submit for review
- Submitted answers are verified by the Lean verifier automatically

### My Answers
- View all your submissions (both exercises and assignments) in one place
- Filter by type: **All / Exercises / Assignments**
- See verification status and scores at a glance
- Click **View** to see answer details and grader feedback

### Resources
- Access learning resources curated by teachers

---

## 4. Teacher & Assistant Features

### Review Workbench
- Access via **Review Workbench** in the sidebar
- Two tabs: **Exercise Answers** and **Assignment Answers**
- Filter by: course, username, question title, grading status
- Click any answer to grade it with a score (0–100) and feedback
- **Batch grading**: select multiple answers and grade them at once

### Question Bank
- Create and manage exercises
- Set title, description (informal + formal Lean), difficulty levels, tags

### Course Management
- Access course settings via the course page → **Manage** button
- Tabs: Overview, Students, Assistants, Assignments, Notifications, Posts

---

## 5. Admin Features

In addition to all Teacher features, Admins can:

### User Management
- Navigate to **User Management** in the sidebar
- View all users in a paginated table
- **Create users** individually
- **Batch import** users from CSV
- **Change user roles** (Student / Teacher / Assistant / Admin)
- **Reset passwords**
- **Delete users**

### System Settings
- View system statistics (user count, verifier status)
- Quick links to user management, course creation, resources

---

## 6. User Management (Admins)

### Create a Single User

1. Go to **User Management** → click **Create User**
2. Fill in:
   - **Student ID** (required) — e.g., `2024000001`
   - **Display Name** (required) — e.g., `Alice Chen`
   - **Email** (optional) — e.g., `alice@example.com`
   - **Role** — Student (default), Teacher, Assistant, or Admin
3. Click **Create User**
4. The user's initial password is their **Student ID**
5. Give the user their Student ID — they must change password on first login

### Batch Import Users

1. Go to **User Management** → click **Batch Import**
2. Select a **Role** for all imported users (default: Student)
3. **Option A: Upload a CSV file** — click **Upload CSV**, select your file
4. **Option B: Paste CSV data** — paste directly into the textarea

#### Supported CSV Format

The system auto-detects both formats:

**Simple format:**
```
student_id,display_name,email
2024000001,Alice Chen,alice@example.com
2024000002,Bob Li,bob@example.com
```

**Student List format** (from university records):
```
Student Code,Name,University,Email,Phone No.,Joined,Comments
2024000001,Alice Chen,Your University,alice@example.com,...
2024000002,Bob Li,Your University,bob@example.com,...
```

The system will auto-detect the "Student Code" and "Name" columns.

5. Click **Import N user(s)**
6. Results will show: "Imported X user(s) successfully, Y failed"
   - Failures (e.g., duplicate Student IDs) are listed with error details

### Delete a User

1. Go to **User Management**
2. Find the user in the table
3. Click the **Delete** button (red, in the Actions column)
4. Confirm deletion in the dialog
5. Admin users cannot be deleted

### Reset a User's Password

1. Go to **User Management**
2. Find the user → click **Reset**
3. Password resets to `1234567890` and the user will be forced to change it on next login

### Change a User's Role

1. Go to **User Management**
2. Find the user → use the **Role dropdown** in their row
3. Select the new role (Admin / Teacher / Assistant / Student)

---

## 7. Course Management (Admins & Teachers)

### Adding Students to a Course

1. Open a course → click **Manage** → go to **Students** tab
2. **Add a single student**: search for a user, click **Add**
3. **Batch import**: click **Batch Import**, paste usernames/emails (one per line)

### Adding Teachers/Assistants
- Go to course **Manage** → **Overview** tab
- Click **Add Instructor** or use the **Assistants** tab

---

## 8. Verifier System

Leaner includes an automated Lean 4 verifier that checks student submissions.

- When a student submits a formal (Lean 4) answer, it's automatically verified
- Verification status is shown in the UI:
  - **Pending** — verification in progress (spinner)
  - **Verified** — Lean code compiles successfully (green)
  - **Failed** — Lean code has errors (red)  
  - **Not Verified** — no formal answer submitted
- The verifier uses **Lean 4 v4.22.0** with **mathlib4** full library
- Verification is performed by a dedicated service running in the deployment

---

## 9. Quick Reference

### Keyboard Shortcuts / Tips
- Use the sidebar to navigate between sections
- Search fields have auto-debounce (500ms)
- The table pagination supports adjustable page sizes
- Hover over table rows to see full content of truncated cells

### Common Tasks

| Task | How |
|------|-----|
| Create an exercise | Sidebar → Question Bank → Create Exercise |
| Submit an answer | Courses → select exercise → Submit Answer |
| Grade submissions | Sidebar → Review Workbench |
| Add students to course | Course → Manage → Students tab |
| Batch import users | Sidebar → User Management → Batch Import |
| Check verifier status | Sidebar → Settings → Verifier Status card |
| View my grades | Sidebar → My Answers |

### Need Help?
Contact your system administrator for:
- Account creation
- Password reset
- Course enrollment
- Feature requests
