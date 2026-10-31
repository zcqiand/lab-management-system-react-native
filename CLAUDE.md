# CLAUDE.md — Lab 管理系统（React Native 版）

> 书稿配套仓 + harness 门禁仓双身份。入口，不是手册。L0 门强制上限 60 行。
> 本仓为《（书稿信息待补）》案例（待补）（Lab 管理系统（React Native 版））的可运行配套工程，是书稿代码块的 **source of truth**。

## 1. 项目定位

Lab 管理系统（React Native 版）（`lab-management-system-react-native`，技术栈 `react-native`）。一句话定位见 README.md。

## 2. 铁律

- **TDD**：每个模块先写失败测试 → 跑确认失败 → 实现 → 跑确认绿 → commit
- **版本钉死**：依赖与 `version-lock.json` 的 `version_lock` 一致；不引入 lock 外的库
- **tag 即放行**：全量回归绿后打 `v<MAJOR>.<MINOR>.<PATCH>-<YYYYMMDD>`（如 `v0.3.54-20260826`）
- **mock-friendly**：安装 + 测试必须在无 Key、无 Docker、无网下全绿
- **功能清单是锚点**：改 `docs/functions/function-tree.md` 走 `/tree-change` 提案，由人批准；
  改功能与改功能清单必须同一个 commit；废弃只改状态，编号永不复用；禁止给 skip 的测试挂功能 ID

- 禁止使用 any 与 @ts-ignore（除非附 ADR 说明）
- 禁止 env/RN_API_BASE_URL 写默认值兜底（fail-fast，suite-hard-rules §1；app-config 缺失必须抛错）
- 禁止绕过 shared 契约生成物手写 API 面（suite-hard-rules §4；生成区 src/api/endpoints/ 禁手改，手写传输层只有 src/api/mutator.ts）
- 禁止在组件里散落 fetch 调用；数据获取走生成物 + mutator 层
- 禁止 RN_API_BASE_URL 之外的 env 键写默认值兜底（fail-fast，suite-hard-rules §1）
- npm 依赖一律走 registry.npmmirror.com
- native 工程面（android/ ios/ 文件夹）禁在骨架期手搓引入；真机/dev client Phase 1+ 独立批补挂

## 3. 技术栈与版本（钉死于 version-lock.json）

React Native 0.88.1（bare CLI 形态，@react-native-community/template 0.88.1 同源钉版；react 19.3.0 / TS 6 / jest 29 / eslint 8 .eslintrc / prettier 2.8.8）。npm 走 registry.npmmirror.com（仓内不设 .npmrc，全局 registry 已指镜像）。X16 槽不分配端口：无 dev server，五门全 CLI（L1-L4 + L4.5 metro bundle 门，产物落 _work/，零 Android SDK 依赖）；native 工程面（android/ ios/ 文件夹）骨架不含，真机/dev client Phase 1+ 补挂；iOS 构建需 macOS，Windows 侧仅 Android；codegen=orval 7.5（client: fetch + mutator，家族 shared 仓名由 -react-native 后缀推导，saas/lab 零改）。明细见 `version-lock.json` 与 README.md 技术栈表。

门禁命令见 `.harness/stack.json`。**不要改它来让门变松。**

## 4. 验收

- 在 **suite 根目录** 跑 `python scripts/gate.py -p lab-management-system-react-native`；exit 0 才算完成
- 本地命令见 README.md「快速开始」

## 5. 指向别处

- 功能清单（唯一锚点） → `docs/functions/function-tree.md`
- 需求 → 任务 → 功能影响 → `docs/requirements/`
- 流程/设计 与功能对齐 → `docs/design/`（人评审，机器只查引用）
- 决策背景 → `docs/adr/`；编码细则 → `docs/conventions/`（不进主上下文）
- 待办与迭代方向 → `PLAN.md`；版本变更 → `CHANGELOG.md`

## 6. 工作循环

0. **开工前分诊**：先过 `using-skills`，把激活 skill 的清单落成 todo。
   顺序：规格(brainstorming)→计划(writing-plans)→测试先红(red-first)→实现(executing-plans)
1. 读 `.state/session.json` 恢复上下文
2. 最小改动
3. 跑 `python scripts/gate.py -p lab-management-system-react-native`；exit 1 回到第 2 步；exit 2 停下问人
4. `/handoff` 更新 `.state/session.json`
