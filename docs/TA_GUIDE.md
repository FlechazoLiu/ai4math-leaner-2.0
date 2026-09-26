---
version: 2.0.1
last_updated: 2026-07-15
---

# TA Guide — Leaner

## Table of Contents
1. [Getting Started](#1-getting-started)
2. [Course Management Overview](#2-course-management-overview)
3. [Managing Students](#3-managing-students)
4. [Grading Submissions](#4-grading-submissions)
5. [Managing Assignments](#5-managing-assignments)
6. [Course Notifications & Posts](#6-course-notifications--posts)
7. [Question Bank](#7-question-bank)

---

## 1. Getting Started

### Account Setup
Your account will be created by an administrator. You will be assigned the **Assistant (TA)** role.

Your login identifier will be your **email address** or **student ID** (set by the administrator when creating your account).

### Initial Password
- **Teachers, TAs, and Admins**: initial password is `default123456`
- **Students**: initial password is their **Student ID** (different from staff accounts)

> Your account is created with `must_change_password = true`, so you will be required to set a new password on first login.

### Login
1. Enter your **Email** or **Student ID** (the one set by the administrator)
2. Enter the initial password: `default123456`
3. On first login, you'll be prompted to **change your password**
4. Enter a new password (minimum 6 characters), confirm it
5. Sign in again with your new password

### Accessing Courses You Manage
Once a teacher assigns you as an assistant to a course, you will see it under the **Review Workbench** in the sidebar. Select your course from the dropdown to start grading.

---

## 2. Course Management Overview

As a TA, you have **full management permissions** for courses you are assigned to. This includes:

- Adding and removing students
- Creating and editing assignments
- Grading submissions
- Creating notifications and posts
- Managing course assistants

### Opening Course Management
1. Go to **Courses** → click on a course you TA for
2. Click **Manage Course** (in the course header)
3. The management page has 7 tabs: Overview, Students, Assistant, Assignments, Notifications, Posts

> **Note**: You can only manage courses you are assigned to as an assistant. Contact the teacher if you need access to a different course. If you try to open a course you are not assigned to, you will see "You are not an assistant for this course."

---

## 3. Managing Students

(unchanged)

---

## 4. Grading Submissions

### Accessing the Review Workbench
Click **Review Workbench** in the sidebar. This opens the new grading interface designed for efficient batch grading.

### Workflow: Course → Assignment → Question → Grade

The grading process follows a simple drill-down flow:

**Step 1: Select Course**
- Use the **Course** dropdown at the top (defaults to your first course)
- Only courses you are assigned to appear in the list

**Step 2: Select Assignment**
- All published assignments for the course are listed
- Click **Grade** on the assignment you want to grade
- This opens the assignment grading page showing all questions

**Step 3: Select Question**
- Each question shows a **progress bar** (graded/total)
- Click **Grade** on a question to start grading
- This opens the one-student-at-a-time grading page

**Step 4: Grade Student Answers**
The grading page shows **one student's answer at a time**:
1. **Student info bar** — name, verification status, submission date
2. **Answer content** — split view:
   - Left: **Informal (natural language) answer** rendered with Markdown
   - Right: **Formal (Lean 4) answer** with syntax-highlighted code block
3. **Score input** — enter a number 0–100 with live color preview
4. Click **Submit & Next** → automatically advances to the next ungraded student
5. Navigate manually using **Previous / Next** buttons

**Filter modes:**
- **Ungraded** (default) — only shows students whose answers haven't been graded yet
- **All** — shows all students, including already-graded ones

**Returning to student:**
- If a student needs to revise, click **Return** to send their answer back to draft

### Progress Tracking
- Each question shows a progress bar: `█ 16/24 (67%)`
- The assignment overview shows overall progress across all questions
- When all answers are graded, the page shows **"All Clear!"** with a summary

### Batch Grading an Entire Question
1. On the assignment page, click **Grade All** on any question
2. Enter a score in the popup
3. All ungraded answers for that question receive the same score

### Returning Submissions to Students
If a student needs to revise and resubmit, you can return their submission:

**Return a single student:**
1. While grading, click **Return** button below the score input
2. The submission is set back to draft — the student can edit and resubmit

> Note: Returning a submission resets the verification status (`isDraft = true`) and deletes the existing grade. When the student resubmits, the verification status is automatically set to `Pending` so the Lean verifier can re-check the code.

---

## 5. Managing Assignments

(unchanged)

---

## 6. Course Notifications & Posts

(unchanged)

---

## 7. Question Bank

(unchanged)

---

## Quick Reference

| Task | How |
|------|-----|
| Grade submissions | Sidebar → Review Workbench → Select Course → Select Assignment → Select Question → Grade |
| Return a submission | In the grading page → **Return** button |
| Add a student to course | Course → Manage → Students → Search → Add |
| Batch import students | Course → Manage → Students → Batch Import |
| Create assignment | Course → Manage → Assignments → Create Assignment |
| Create exercise | Sidebar → Question Bank → Create Question |
| Send notification | Course → Manage → Notifications → Create Notification |

---

## Need Help?
- Contact the course teacher for course-specific questions
- Contact the administrator for account or technical issues
