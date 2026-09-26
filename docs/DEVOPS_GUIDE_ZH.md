---
version: 2.0.0
last_updated: 2026-07-15
---

# Leaner 部署运维指南

## 目录
1. [系统概述](#1-系统概述)
2. [环境要求](#2-环境要求)
3. [本地开发环境搭建](#3-本地开发环境搭建)
4. [部署](#4-部署)
5. [配置参考](#5-配置参考)
6. [管理操作](#6-管理操作)
7. [排错指南](#7-排错指南)
8. [架构说明](#8-架构说明)

---

## 1. 系统概述

Leaner 是一个面向 Lean 4 数学证明的形式化验证学习平台，由 4 个 Docker 容器组成：

| 容器 | 角色 | 端口 |
|------|------|------|
| `leaner-db` | PostgreSQL 数据库 | 5432 |
| `leaner-be` | Python gRPC 后端 | 7720 |
| `leaner-fe` | Next.js 前端（SSR） | 3000 |
| `verifier` | Lean 4 验证器（可选） | 8030 |

### 技术栈
- **前端**：Next.js 15.3 (App Router)、React 19、Tailwind CSS v4、shadcn/ui、@connectrpc/connect (gRPC)
- **后端**：Python 3.13、gRPC (aio)、Prisma ORM
- **验证器**：Lean 4 v4.22.0 + mathlib4
- **数据库**：PostgreSQL 17

---

## 2. 环境要求

### 硬件要求
| 模式 | 内存 | 硬盘 | 适用场景 |
|------|------|------|----------|
| **基础模式**（无验证器） | 2 GB | 10 GB | 低流量、学习用途 |
| **完整模式**（含验证器） | 4+ GB | 20 GB | 生产环境（需验证代码） |

### 软件要求
- Docker + Docker Compose v2
- Python 3.12+（后端本地开发）
- Node.js 22+（前端本地开发）
- Buf CLI（Proto 代码生成）

---

## 3. 本地开发环境搭建

### 3.1 克隆项目

```bash
git clone <repo-url> leaner
cd leaner
cp .env.example .env
# 编辑 .env 配置你的参数
```

### 3.2 环境变量

最小 `.env` 配置：

```env
POSTGRES_PASSWORD=你的数据库密码
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# 初始管理员账号（可选）
INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=你的管理员密码
```

### 3.3 启动数据库

```bash
docker compose up -d pg
```

### 3.4 生成 Proto 代码

```bash
cd protos
buf generate
```

### 3.5 运行后端

```bash
cd leaner-be
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
prisma generate
prisma db push
python main.py
```

### 3.6 运行前端

```bash
cd leaner-fe
npm install
npm run dev
```

前端地址：`http://localhost:3000`。

---

## 4. 部署

### 4.1 构建镜像

```bash
cd leaner
docker build -t leaner/leaner-fe:latest leaner-fe/
docker build -t leaner/leaner-be:latest leaner-be/
docker build -t leaner/verifier:latest verifier/
```

### 4.2 上传到服务器

```bash
# 保存镜像
docker save leaner/leaner-fe:latest > /tmp/leaner-fe.tar
docker save leaner/leaner-be:latest > /tmp/leaner-be.tar

# 上传到服务器
rsync -P /tmp/leaner-fe.tar user@server:/path/to/deploy/
rsync -P /tmp/leaner-be.tar user@server:/path/to/deploy/

# 在服务器上
cd /path/to/deploy
docker load < leaner-fe.tar
docker load < leaner-be.tar

# 启动（无验证器）
docker compose up -d

# 或启动（含验证器）
docker compose --profile verifier up -d
```

### 4.3 首次启动

首次启动时，`leaner-db-bootstrap` 容器会：
1. 等待 PostgreSQL 就绪
2. 执行 `prisma db push` 创建/迁移表
3. 创建初始管理员账号（如果配置了 `INITIAL_ADMIN_*` 变量）
4. 退出

如果 `prisma db push` 报数据丢失警告，重新执行：

```bash
docker compose run leaner-db-bootstrap sh -c "cd /app && npx prisma db push --accept-data-loss"
```

### 4.4 更新部署

```bash
# 本地构建新镜像
# 保存并上传到服务器
# 在服务器上执行：
docker load < leaner-fe.tar
docker load < leaner-be.tar
docker compose up -d
```

---

## 5. 配置参考

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `POSTGRES_PASSWORD` | — | PostgreSQL 密码（必填） |
| `DATABASE_URL` | `postgresql://postgres:${POSTGRES_PASSWORD}@pg:5432/leaner` | 数据库连接串 |
| `AUTH_SECRET` | — | NextAuth JWT 加密密钥（必填） |
| `NEXTAUTH_URL` | — | 前端公网地址（生产环境必填） |
| `INITIAL_ADMIN_EMAIL` | — | 初始管理员邮箱 |
| `INITIAL_ADMIN_USERNAME` | — | 初始管理员用户名 |
| `INITIAL_ADMIN_PASSWORD` | — | 初始管理员密码 |
| `DISABLE_SELF_REGISTRATION` | `true` | 设为 `false` 允许自助注册 |
| `LEANER_FE_IMAGE` | `leaner/leaner-fe:latest` | 前端镜像标签 |
| `LEANER_BE_IMAGE` | `leaner/leaner-be:latest` | 后端镜像标签 |
| `PG_IMAGE` | `leaner/postgres:17` | PostgreSQL 镜像标签 |

### 验证器配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ENABLE_VERIFIER` | `false` | 启用 Lean 代码验证 |
| `VERIFIER_MEM_LIMIT` | `4g` | 验证器容器内存限制 |
| `VERIFIER_MEMSWAP_LIMIT` | `8g` | 验证器容器 Swap 限制 |

---

## 6. 管理操作

### 6.1 创建用户

**单个创建：**
1. 管理员登录 → **User Management**
2. 点击 **Create User**
3. 填写：学号、姓名、邮箱（可选）、角色
4. 点击 **Create User**

**批量导入：**
1. 进入 **User Management** → **Batch Import**
2. 选择角色（默认 Student）
3. 上传 CSV 文件或粘贴数据：
   ```
   student_id,display_name,email
   2024000001,Alice Chen,alice@example.com
   ```
4. 点击 **Import N user(s)**

### 6.2 修改角色

在 User Management 页面的角色下拉菜单中修改：
- **Admin** — 系统管理员
- **Teacher** — 可创建课程、管理作业、批改
- **Assistant** — 助教，可管理被分配课程
- **Student** — 可查看课程、提交答案

### 6.3 重置密码

点击用户行中的 **Reset**，密码重置为 `1234567890`，用户下次登录会被要求修改密码。

### 6.4 删除用户

点击用户行中的 **Delete**（垃圾桶图标）。管理员账号不能被删除。

### 6.5 查看验证器状态

管理员进入 **Settings** 查看验证器状态、用户数和部署模式。

---

## 7. 排错指南

### 容器无法启动

```bash
# 查看日志
docker compose logs leaner-db --tail=50
docker compose logs leaner-be --tail=50
docker compose logs leaner-fe --tail=50

# 重启全部
docker compose down
docker compose up -d
```

### 数据库问题

```bash
# 检查数据库状态
docker compose ps pg

# 重启数据库
docker compose restart pg

# 如果数据库因磁盘满启动失败
df -h
docker system prune -f
```

### Prisma 迁移问题

```bash
# 接受数据丢失（新增列时会用到）
docker compose run --no-deps leaner-be sh -c "cd /app && npx prisma db push --accept-data-loss"
```

### 前端构建失败

Google Fonts 在中国可能无法访问。项目已使用系统字体替代 Inter 字体。如仍需 Google Fonts，请确保 Docker 构建环境能正常访问 `fonts.googleapis.com`。

### 验证器不工作

```bash
# 检查验证器健康状态
curl http://localhost:8030/health

# 查看日志
docker compose logs verifier --tail=20

# 验证器需要 4GB+ 内存，内存不足时可考虑关闭验证器
```

### 学生搜索不可用

确保后端运行的是最新代码。`ListUsers` 方法会搜索 `username`、`displayName`、`email` 和 `studentId` 四个字段。

### 改密后循环跳转

如果用户修改密码后不断在登录页和改密页之间循环，登录后手动清除浏览器 Cookie 再重新登录。这是因为旧的 JWT 仍在浏览器中。

---

## 8. 架构说明

```
┌─────────────┐     gRPC (7720)     ┌──────────────┐
│             │ ◄───────────────── │              │
│  leaner-fe  │                     │  leaner-be   │
│  (Next.js)  │ ─────────────────► │  (Python)    │
│  Port 3000  │     HTTP/JSON       │              │
└─────────────┘                     └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │  PostgreSQL  │
                                    │  leaner-db   │
                                    │  Port 5432   │
                                    └──────────────┘
                                           │
                                    ┌──────▼───────┐
                                    │  Verifier    │
                                    │  (Lean 4)    │
                                    │  Port 8030   │
                                    └──────────────┘
```

### v2.0.0 新功能

| 功能 | 说明 |
|------|------|
| **成绩册** | GradebookTab 学生×作业分数矩阵表 |
| **退回作业** | ReturnAssignmentAnswer RPC |
| **批量退回** | BatchReturnAssignmentAnswers RPC |
| **编译失败重交** | 验证失败后可修改重交 |
| **删除作业** | Assignments 标签页新增删除按钮 |
| **作者姓名** | AssignmentAnswer 新增 authorName 字段 |
| **数据库备份** | 自动备份脚本，8小时 cron |

### Proto 结构

所有 API 定义在 `protos/leaner/v1/leaner.proto`：
- **UserService** — 登录、用户管理、批量导入
- **CourseService** — 课程管理、选课、教师分配
- **AssignmentService** — 作业与题目
- **AnswerService** — 提交、批改、验证
- **NotificationService** — 课程通知
- **PostService / CommentService** — 讨论
- **ResourceService** — 资源管理
- **TagService** — 题目标签

### 代码生成

修改 `protos/leaner/v1/leaner.proto` 后：

```bash
cd protos
buf generate
```

这会生成：
- `leaner-be/leaner_be/gen/` — Python gRPC 代码
- `leaner-fe/lib/gen/` — TypeScript 类型定义和客户端
