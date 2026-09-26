---
version: 2.0.0
last_updated: 2026-07-15
---

# 示例测试作业

使用此示例作业来测试完整的作业流程：创建 → 提交 → 批改 → 退回 → 重新提交。

---

## 作业：Lean 4 入门——基础证明

**课程**：任意数学/逻辑课程  
**难度**：入门  
**目标**：通过编写最简单的 Lean 4 证明，熟悉基本策略（tactics）的用法。

### 介绍

本作业包含三道非常简单的 Lean 4 证明题。你只需要使用 `exact` 和 `intro` 这两个基本策略即可完成。如果你能完成这三道题，就说明你已经初步掌握了 Lean 4 的证明编写流程。

---

## 题目

### 第 1 题：恒真命题

**自然语言描述**

证明命题 `True`。在 Lean 中 `True` 是一个恒真命题，它有一个唯一的证明 `True.intro`（也可以简写为 `trivial`）。

> 提示：你只需要输入 `exact True.intro` 或 `exact trivial` 即可完成证明。

**形式化描述**

在 Lean 4 中完成以下证明：

```lean4
theorem true_is_true : True :=
by
  -- 请在此处填写你的证明
  sorry
```

---

### 第 2 题：同一律

**自然语言描述**

证明如果 `P` 成立，那么 `P` 成立。即 `P → P`，这是逻辑学中最基本的同一律。

> 提示：使用 `intro h` 引入假设 `h : P`，然后 `exact h` 完成证明。

**形式化描述**

在 Lean 4 中完成以下证明：

```lean4
theorem identity (P : Prop) : P → P :=
by
  -- 请在此处填写你的证明
  sorry
```

---

### 第 3 题：蕴含的前件忽略

**自然语言描述**

证明如果 `P` 成立且 `Q` 成立，那么 `P` 成立。即 `P → Q → P`。这表示如果两个命题都成立，你可以忽略第二个，只返回第一个。

> 提示：你需要两次使用 `intro`：`intro hP` 和 `intro hQ`，然后 `exact hP`。

**形式化描述**

在 Lean 4 中完成以下证明：

```lean4
theorem ignore_second (P Q : Prop) : P → Q → P :=
by
  -- 请在此处填写你的证明
  sorry
```

---

## 参考答案（教师用）

以下为三道题的完整解答，供教师批改时参考。

<details>
<summary>点击展开答案</summary>

### 第 1 题答案

```lean4
theorem true_is_true : True :=
by
  exact True.intro
```

或更简洁的写法：

```lean4
theorem true_is_true : True :=
by
  trivial
```

### 第 2 题答案

```lean4
theorem identity (P : Prop) : P → P :=
by
  intro h
  exact h
```

### 第 3 题答案

```lean4
theorem ignore_second (P Q : Prop) : P → Q → P :=
by
  intro hP
  intro hQ
  exact hP
```

</details>

---

## 创建作业步骤

1. 进入课程 → **Manage** → **Assignments** → **Create Assignment**
2. 标题：**Lean 4 入门——基础证明**
3. 描述：粘贴上面的"介绍"部分内容
4. 保存为草稿
5. 分别添加 3 道题目，每道题填写：
   - **Question Title**：题目标题
   - **Informal Description**：自然语言描述
   - **Formal Description**：形式化描述（代码框架，含 `sorry`）
6. 发布作业

## 测试流程

1. **学生视角**：进入作业 → 查看题目 → 补全 `sorry` 部分 → 提交
2. **批改视角**：Review Workbench → 筛选作业 → 评分 → 退回
3. **退回重交**：教师退回 → 学生收到草稿 → 修改 → 重新提交
