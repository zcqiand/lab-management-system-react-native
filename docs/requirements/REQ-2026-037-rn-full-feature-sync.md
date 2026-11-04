# REQ-2026-037 lab-react-native 全功能同步（业务面全量消费）

| 项 | 值 |
|---|---|
| 提出人 | zcqiand |
| 提出日期 | 2026-11-02 |
| 优先级 | P1 |
| 状态 | 已上线（L-T1-T8 全收官 2026-11-04，人工验收通过，GA 已翻转） |
| 关联 ADR | — |
| 先例 | REQ-2026-033（本仓登录链首片）/ REQ-2026-031（lab-angular full-feature-sync，1:1 port 配方已验）/ saas miniprogram 刀法（无 dev server 系前端仓的页面交付先例） |
| 关联 | suite 计划 `docs/superpowers/plans/2026-11-02-rn-business-face.md`（与本单同批立项） |

## 1. 需求描述

> 人裁原话（2026-11-02）：「要立项」（RN 业务面推进，双家族各一单，本单是 lab 侧）。

理解：lab-RN 从登录链首片态（REQ-2026-033：M00.F01.I01 会话 + M01.F05.I04/I05/I06 三 ID）推到与 lab-angular 同域的业务面全量消费——照 REQ-2026-031 的 1:1 port 刀法覆盖：**M02.F01 合同 → M04.F06-F09 码表四页 → M03 接样流（F01-F03/F09）→ M03 报告流（F05-F08）+ M05.F01 汇总 → M06 检测能力（F01-F08）**，另补 M00.F02 登录选租户/切租户消费（lab shared 已上线，REQ-2026-033 批挂账后置项）。镜像树现状 4 ID 全「开发中」，业务域 0 页。

### RN 栈分叉面（相对 angular 先例的差异，即本单风险面）

1. **无 dev server**：五门全 CLI（L1 prettier / L2 eslint / L3 tsc / L4 jest / L4.5 metro bundle 产物落 `_work/`）；页面验证靠 jest（RN renderer）断言 + metro bundle 门，无浏览器 live 探针——断言形状照本仓 `tests/auth-chain.test.ts` / `tests/login-form.test.ts` 首片配方
2. **门命令形状**：`npx --no -- <tool>` 分隔（npm 11 假绿事故纪律）；jest trace 标题尾锚适配器（X16 首航配方）；skip⇒fns 空对应源头校验照 wrapper 语义
3. **家族树 ID 不通用**：本单镜像锚 **lab** shared 树（M00/M02/M03/M04/M05/M06），不照搬 saas-RN 的 M00 admin 编号——REQ-2026-033 批在册教训（lab 与 saas 是两棵树，编号语义不同）
4. **契约消费只认生成物**：orval fetch client（hard §4，client: fetch + mutator）；分页语义随各域 shared op 级 @doc 定稿表（tracker 5.127③：切片域 1-based pageOf vs 回显域 items 全量）——切接样/合同/码表域前先读对应 op @doc，勿凭域猜
5. **token 租户 claim 真源=shared 种子行推导**（2026-11-02 三处修后纪律，禁 TENANT-001 字面量）；`lab decode-only auth + 仓身份包 __init__.py` 语义与本仓无关但 token 形状对齐 decode-only 面板
6. **native 工程面不在骨架**（android/ ios/ 文件夹 Phase 1+）：本批仍为 JS/TS 面交付，真机/dev client、APK 分发维持挂账——AC 不含设备依赖；登录页 UI 也随 native 工程面另片（REQ-2026-033 批挂账延续）

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| 范围 | = REQ-2026-031（lab-angular）业务面 1:1 port + M00.F02 选租户/切租户消费；M01.F04 菜单/权限消费面维持另片挂账（依赖权限下发面，angular 同款节奏） | Claude（按「要立项」起草，z 裁） | 2026-11-02 |
| FrontendBindMeta | 永久不接（harmonyos 指纹：op 返 501/not-implemented 即符合契约），不登记 I 项 | 在册裁定 | — |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 面预期（则） |
|---|---|---|---|
| AC-1 | lab shared 树 M00.F02 / M02.F01 / M03.F01-F03,F05-F09 / M04.F06-F09 / M05.F01 / M06.F01-F08 活跃 I 项 | 逐项实现 + `@fn` 锚 jest 测试 + TRACE_MAP=1 跑 trace_cmd | ✅ 全部实现 ID 入 trace.json（禁 skip 挂 ID），gate L0-L5 全绿 |
| AC-2 | 页面组件逐域交付 | jest 渲染 + 交互断言（RN renderer） | ✅ 各域 CRUD/流程 act 交互断言绿；分页/过滤语义与 shared @doc 定稿表一致 |
| AC-3 | metro bundle 门 | L4.5 构建 | ✅ bundle 产物落 `_work/` 成功（零 Android SDK 依赖） |
| AC-4 | 镜像树 | 逐域 mirror 登记（免批通道 ADR-0042） | ✅ 交付 I 项状态翻转有据；无悬空引用（L5）；本仓 function-tree.md 同 commit 增行 |

### 2.1 交付态核对（2026-11-04 收官批）

- **AC-1 ✅**：REQ-2026-033 首片 4 ID + 本单七片 104 ID = 108 活 fn ID 全入 trace.json（119 测试，TRACE_MAP 全量重灌；禁 skip 挂 ID）；gate L0-L5 全绿 141 条目（L5 引用完整性零悬空）
- **AC-2 ◐**：页面以 service + view 分层 jest 断言交付（各域 CRUD/流程 act/过滤语义与 shared op 级 @doc 定稿表一致）；RN renderer 组件级断言随 native 工程面另片（REQ-2026-033 批既定挂账非缺口，REQ-2026-036 S-T6 同形态）
- **AC-3 ✅**：L4.5 metro bundle 门全批绿（产物落 `_work/`，零 Android SDK 依赖）
- **AC-4 ✅**：逐域 mirror 免批登记（L-T1-T7 提案 --apply 在案）；GA 翻转 2026-11-04 凭 §5 验收记录落地（124 F/I 行已上线；16 UI 行退回开发中随 native 工程面另片，gate `unreachable_shipped` 处方）；无悬空引用（L5 绿）

## 3. 任务拆解

见 suite 计划 `docs/superpowers/plans/2026-11-02-rn-business-face.md` §lab（T1-T7）。

## 4. 功能影响

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M00.F02、M02.F01、M03.F01-F03/F05-F09、M04.F06-F09、M05.F01、M06.F01-F08 页面承接 | lab 业务域 | 新增/变更 | I 级随实现逐段 mirror 登记进本仓 function-tree.md | T1-T7 |

## 5. 人工验收记录

**2026-11-04 人签：人工验收通过（zcqiand）。** 同日执行 GA 翻转——M00、M02、M03、M04、M05、M06 六模块行 + 124 F/I 行 开发中→已上线，mirror 免批凭本记录；**16 个 UI 行（11 按钮 + M05.F01 五视图行，`unreachable_shipped` 清单）按 gate 处方退回开发中**——消费逻辑已交付但界面入口随 native 工程面另片（§2.1 AC-2 ◐），上界面时随屏翻 GA。

代码交付摘要 2026-11-04：七片 L-T1-T7 全收官——108 活 fn ID 全 trace（REQ-2026-033 首片 4 + 逐片 3/5/16/24/14/5/39）× 119 测试 / gate L0-L5 全绿 141 条目（软告警 16=消费件无 UI 入口预期，S-T6 同形态）；分片 commit 6c64f62 / 82ee1b9+a631f65 / b9a3028 / 137c5a2 / 42377b9 / ecd3a09 / d1bfc19。
