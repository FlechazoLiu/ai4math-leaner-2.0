---
version: 2.0.0
last_updated: 2026-07-15
---

# Student Guide — Leaner

## Table of Contents
1. [Getting Started](#1-getting-started)
2. [Your Dashboard](#2-your-dashboard)
3. [Exploring Courses](#3-exploring-courses)
4. [Viewing Exercises & Submitting Answers](#4-viewing-exercises--submitting-answers)
5. [Checking Your Answers](#5-checking-your-answers)
6. [Assignments](#6-assignments)
7. [Resources](#7-resources)

---

## 1. Getting Started

### Account Creation
Accounts are created by an administrator. You will receive your **Student ID** (username) and your initial password is your **Student ID**.


### First Login
1. Open the platform URL in your browser
2. **Student ID** login mode is selected by default
3. Enter your **Student ID** and **Student ID** as password
4. You will be prompted to **change your password** on first login
5. Enter a new password (minimum 6 characters), confirm it
6. Sign in again with your new password


### If You Forget Your Password
Contact your teacher or administrator to reset it.

---

## 2. Your Dashboard

After logging in, you land on the **Dashboard** which shows:
- A welcome message with your name
- Your enrolled courses in a grid

Use the **sidebar** on the left to navigate between sections:

| Section | Purpose |
|---------|---------|
| **Dashboard** | Home — view your courses |
| **Courses** | Browse and access all enrolled courses |
| **Exercises** | Browse practice exercises |
| **My Answers** | View all your submissions and grades |
| **Resources** | Access learning materials |

---

## 3. Exploring Courses

### Viewing Your Courses
From the Dashboard or **Courses** page, you can see all courses you are enrolled in.

### Course Content
Click a course card to open it. Inside each course you will find:
- **Notifications** — announcements from the teacher
- **Assignments** — graded work to complete
- **Posts** — discussions and updates


---

## 4. Viewing Exercises & Submitting Answers

### Finding Exercises
1. Click **Exercises** in the sidebar
2. Browse the exercise list, filter by title, tags, or difficulty
3. Click any exercise to view its details

### Submitting an Answer
1. On the exercise detail page, click **Submit Answer**
2. You'll see the question statement and any formal description
3. Provide your answer in two parts:
   - **Informal Answer** (required) — explain your solution in natural language (Markdown supported)
   - **Formal Answer** (optional) — write a Lean 4 proof
4. Choose what to do:
   - **Save as Draft** — save your work-in-progress (not submitted for review)
   - **Submit Answer** — submit for grading (cannot be undone)

### Lean Verification
If you submit a **Formal Answer** (Lean 4 code), your code will be automatically checked by the Lean 4 compiler automatically.

**Verification statuses:**

| Status | Meaning |
|--------|---------|
| **Pending** | Your code is queued for verification |
| **Verified** | Your Lean code compiles successfully with no errors |
| **Failed** | Your Lean code has compilation errors — see the error details below your answer |
| **Not Verified** | No formal answer was submitted, or verification is not applicable |

The verification status appears below your answer. If verification fails, the specific error message from the Lean compiler will be displayed to help you debug.

### Resubmitting After Compilation Failure
If your Lean code **fails** verification, you will see a **"Revise & Resubmit"** link next to the failed answer. Click it to edit your code and resubmit. There is no limit on the number of resubmissions.

### Teacher/TA Returns
If your teacher or TA returns your submission (e.g., for revisions), your answer will be set back to draft status. You can then edit and resubmit it.

> **Important**: When you resubmit a returned answer, the system automatically re-triggers Lean verification. The verification status will be set to **Pending** and the Lean compiler will re-check your formal code. 

---

## 5. Checking Your Answers

Go to **My Answers** in the sidebar to see all your submissions:
- **Status**: Draft / Submitted / Graded
- **Verification**: Pending / Verified / Failed
- **Score**: Your grade (once reviewed)

Click **View** on any answer to see details and grader feedback.

---

## 6. Assignments

Assignments are graded coursework created by your teacher.

### Viewing Assignments
Open a course and go to the **Assignments** tab. Click any assignment to start working.

### Answering Assignment Questions
1. Each assignment has one or more questions
2. Answer each question with an informal and/or formal answer
3. Save answers individually as you work
4. When all questions are answered, click **Submit Assignment**

> **Note**: Once submitted, an assignment is final and cannot be edited.

### Checking Grades
Your score and feedback appear in the assignment view after the teacher grades it. You can also see all graded submissions in **My Answers**.

---

## 7. Resources

The **Resources** page provides curated learning materials for Lean 4:
- **Getting Started** — environment setup guides, online playgrounds
- **Textbooks & Docs** — official tutorials, theorem proving guides
- **Interactive Exercises** — browser-based Lean practice
- **Theorem Search** — tools to find theorems in Mathlib4
- **Community & Tools** — Zulip chat, GitHub repositories

Use the filter sidebar to narrow by type or difficulty.

---

## Need Help?
- Contact your teacher or TA for course-specific questions
- For technical issues (can't log in, broken page), contact the administrator
- Join the [Lean Zulip Chat](https://leanprover.zulipchat.com/) for Lean language help
