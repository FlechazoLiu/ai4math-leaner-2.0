# Leaner (AI4Math Leaner 2.0)

Leaner 是一个基于 Lean 4 定理证明器的现代化互动式数学/逻辑编程学习平台。通过提供完整的课程生态、习题系统、以及面向公式和定理证明的自动验证环境，协助学生、助教和教师高效进行基于 Lean 4 的数学教学和评估。

## 🏗️ 架构概览 (Architecture)

系统采用**微服务与前后端分离**架构，各核心服务通过 Docker Compose 进行容器化编排并独立部署：

1. **Frontend (`leaner-fe`)**: 客户端与用户交互层，高度依赖服务端渲染 (SSR)。前端直接与 Backend 进行 RPC 交互。
2. **Backend (`leaner-be`)**: 核心业务处理层，提供高效的数据调度功能。采用并实现 gRPC (Protocol Buffers) 与前端进行严谨的 API 强类型契约通信，同时向后直连 PostgreSQL 数据库。
3. **Verifier (`verifier`)**: 专属的高性能核心算力节点（独立微服务）。接收后端发来的验证请求，在后端维持着数个独立的常驻 Lean REPL 服务器环境池解决极高的 Lean 初始化开销，负责即时验证用户的 Lean 4 证明代码运行结果。
4. **Database (`pg`)**: PostgreSQL 17 用于集中式存储用户的课程记录、社交评论以及作业状态，通过 Prisma ORM 进行建模与操控。

## 🛠️ 技术栈 (Tech Stack)

### 前端生态层 (`leaner-fe`)
- **核心框架**: **Next.js 15.3** (借助 Turbopack 加速) 与 **React 19** 驱动前端界面。
- **协议与通信**: 采用 `@connectrpc/connect` 和 `@bufbuild/protobuf` 进行面向 gRPC 的客户端通信。
- **UI & 样式**: 基于 **Tailwind CSS v4** 进行样式管控，辅以 **Radix UI** 无头组件库 (Headless UI) 和 **Lucide React** 图标库构成底层组件逻辑。
- **内容渲染**: 引入 **KaTeX** 和 `remark-math` 组合用于高保真数学公式渲染，依赖 **Shiki** 用于强大的 Lean 4 代码语法高亮。
- **状态与认证**: 使用 **next-auth (Beta)** 进行会话认证以及 **SWR** 用于客户端数据获取，引入 **Zod** 处理表单 Schema 验证。

### 后端业务节点 (`leaner-be`)
- **核心框架**: 基于 **Python 3.13** 搭建底层数据底座。
- **API 通信/契约 (Proto Contracts)**: 摒弃了传统的 RESTful API，全面采用 **gRPC (`grpcio` / `protobuf`)** 开发通信端点 (`leaner.v1`)。
- **数据库 ORM**: 引入 **Prisma Python** (基于跨语言 Prisma) 管理数据库结构迁移及类型安全的 CRUD 查询操作。
- **异步控制**: 利用 `aiohttp` 与 `asyncio` 管理异步依赖及与 Verifier 节点的通讯任务。

### 验证器计算节点 (`verifier`)
- **HTTP 接口层**: 采用 **FastAPI** 和 **Uvicorn** 轻量且快速地拉起内部评测接口（仅开放给后端通讯使用）。
- **进程管理**: 巧妙利用 Python 原生 `multiprocessing` 模块派发基于 `lean-interact` 的内部服务器 worker (LeanServerWorker)。它会对 `LeanREPL` 资源进行池化常驻管理，避免每次验证产生庞大的 Lean 4 冷启动编译耗时。

## ✨ 核心业务功能与能力 (Capabilities)

*   🔑 **多角色与权限体系 (Role-Based Access Control)**
    基于管理员、教师、助教和学生四种角色权限树。不同角色享有不同的数据边界操作权限（如学生申请入课，教师与助教进行课程维护与审批）。
*   📚 **完善的课程和作业生命周期 (Course & Assignment Ecosystem)**
    拥有涵盖完整的课程体系、课程内的作业以及题目定制特性。针对证明题目，设计了自然语言描述与形式化定义双重声明结构。
*   🤖 **Lean 4 代码实时编写与验证 (Live Evaluation)**
    学生端作业/解答分为草稿和提交态。系统会将形式化代码传递给 Verifier 核心组件运行并实时返回验证状态，允许平台针对代码结果（如 Sorry、Failed 或 Verified）进行自动化评级或提供即时学习反馈。
*   💬 **社交化讨论与通知 (Community & Notification)**
    附带内部论坛讨论以及讨论树评论，配发全站内部消息信箱/横幅确保通知触达。并内建了对各种上传外部资源引用的支持。
*   📊 **评测数据管理 (Grading)**
    拥有显式的评级/打分映射表记录体系，供教师及助教管理系统内的答卷成绩并在前端页面直接浏览。

## 🚀 快速启动指南

请参考项目根目录下的 `docs/setup.md` 文件了解完整的开发环境配置和部署细节。

## 📄 License

本项目基于 [MIT License](LICENSE) 开源。
