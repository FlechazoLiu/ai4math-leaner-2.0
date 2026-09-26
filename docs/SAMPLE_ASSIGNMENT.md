---
version: 2.0.0
last_updated: 2026-07-15
---

# Sample Test Assignment

Use this sample assignment to test the full workflow: creating → submitting → grading → returning → resubmitting.

---

## Assignment: Lean 4 Basics — Simple Proofs

**Course**: Any mathematics / logic course  
**Difficulty**: Beginner  
**Objective**: Get familiar with Lean 4 basics by writing very simple proofs.

### Description

This assignment contains three very simple Lean 4 proofs. You only need two basic tactics: `exact` and `intro`. If you can complete these three problems, you have mastered the basic Lean 4 proof workflow.

---

## Questions

### Question 1: The True Proposition

**Informal Description**

Prove the proposition `True`. In Lean, `True` is a proposition that is always true, and it has a single proof called `True.intro` (which can also be written as `trivial`).

> Hint: Just write `exact True.intro` or `exact trivial` to complete the proof.

**Formal Description**

Complete the following Lean 4 proof:

```lean4
theorem true_is_true : True :=
by
  -- fill in your proof here
  sorry
```

---

### Question 2: The Identity Law

**Informal Description**

Prove that if `P` holds, then `P` holds. In logical notation: `P → P`. This is the most basic law of logic.

> Hint: Use `intro h` to introduce the hypothesis `h : P`, then `exact h` to finish.

**Formal Description**

Complete the following Lean 4 proof:

```lean4
theorem identity (P : Prop) : P → P :=
by
  -- fill in your proof here
  sorry
```

---

### Question 3: Ignore the Second Premise

**Informal Description**

Prove that if `P` holds and `Q` holds, then `P` holds. In logical notation: `P → Q → P`. This says that if both propositions hold, you can ignore the second one and return the first.

> Hint: Use `intro` twice: `intro hP` then `intro hQ`, then `exact hP`.

**Formal Description**

Complete the following Lean 4 proof:

```lean4
theorem ignore_second (P Q : Prop) : P → Q → P :=
by
  -- fill in your proof here
  sorry
```

---

## Answer Key (For Teachers)

<details>
<summary>Click to expand answers</summary>

### Answer 1

```lean4
theorem true_is_true : True :=
by
  exact True.intro
```

Or more concisely:

```lean4
theorem true_is_true : True :=
by
  trivial
```

### Answer 2

```lean4
theorem identity (P : Prop) : P → P :=
by
  intro h
  exact h
```

### Answer 3

```lean4
theorem ignore_second (P Q : Prop) : P → Q → P :=
by
  intro hP
  intro hQ
  exact hP
```

</details>

---

## How to Create This Assignment

1. Go to course → **Manage** → **Assignments** → **Create Assignment**
2. Title: **Lean 4 Basics — Simple Proofs**
3. Description: paste the "Description" section above
4. Save as draft
5. Add 3 questions, each with:
   - **Question Title**: the question's title
   - **Informal Description**: the natural language description
   - **Formal Description**: the Lean code scaffold (with `sorry`)
6. Publish the assignment

## Test Workflow

1. **Student**: open assignment → view questions → fill in `sorry` → submit
2. **Grading**: Review Workbench → filter by assignment → score → return
3. **Return & Resubmit**: teacher returns → student edits → resubmits
