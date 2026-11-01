# REQ-2026-033 RN 登录链接线首片（session/token/authed fetch）

| 项 | 值 |
|---|---|
| 提出人 | zcqiand（2026-11-01 人裁：saas RN 登录链首片 REQ-2026-032 全绿后复刻 lab） |
| 提出日期 | 2026-11-01 |
| 优先级 | P1 |
| 状态 | 开发中 |
| 关联 ADR | — |

## 1. 需求描述

saas RN 登录链首片（REQ-2026-032，837e342）全绿收官后的 lab 复刻片。lab 登录语义与
saas 不同：lab 是 SSO client，原生客户端走 **M01.F05.I06 原生登录**（`/api/auth/native-login`
校验委托 saas IdP 代理，lab 自家 JWT 签发——该端点即为本类客户端设计）。

本片交付 lab RN 的登录链**逻辑接线面**（Phase 0，无真机）：

- `SessionState` 会话状态 + 可注入 token store（lab 形状：token/refreshToken/user/tenants）
- 登录（原生登录换 lab JWT）/ 当前会话（GET /api/auth/me 回填身份与租户）/ 刷新 token
  （轮换 access+refresh）/ 登出（POST 清存储 + 本地全清）四条流程的消费面
- 登录入参装配与校验纯函数（fail-fast；lab LoginRequest 只有 username/password——
  clientId 服务端持，REQ-2026-023 方案 A 语义）

**范围外（后置）**：登录页 UI（shared 树认证域页面类子项）随 native 工程面另片；SSO
跳转/回调（浏览器流，原生客户端不适用）；动态菜单/权限集消费（授权面，随导航切片另片）；
登录选租户/切租户（M00 域语义，随租户域切片）；token 持久化（AsyncStorage）与 metro env
烘焙随 Phase 1+。

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| lab 首片是否照搬 saas 五 ID？ | 不照搬。lab 树认证域 ID 与 saas 完全不同（saas 树密码登录子项在 lab 树同 F 位是动态菜单），按 lab 树实情取四 ID：F05.I06/I04/I05 + M00.F01.I01 | Claude（树实情核对） | 2026-11-01 |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 预期（则） |
|---|---|---|---|
| AC-1 | 无会话 | `login(username, password)` 走 stub fetch 返回 200 LoginResponse | token/user/tenants 入 store，后续请求带 Authorization |
| AC-2 | 无会话 | 登录入参缺 username 或 password | fail-fast 抛错，不发请求 |
| AC-3 | 已有旧会话 | 登录后端回非 200（ErrorResponse） | 抛错并清空本地会话残留 |
| AC-4 | 已登录 | `me()` | 带 token 调 `/api/auth/me`，身份+租户+currentTenantId 回填 |
| AC-5 | 已登录 | `refresh()` | 带 refreshToken 调 `/api/auth/refresh`，token 对轮换；失败则清会话抛错 |
| AC-6 | 已登录 | `logout()` | 带 token 调 `/api/auth/logout`（body={token}）后本地全清 |
| AC-7 | 全部 | 全门 jest + TRACE_MAP=1 | gate L0-L5 exit 0，四锚落 `.state/trace.json` |

## 3. 任务拆解

| 任务 ID | 任务描述 | 类型 | 负责人 | 预估 | 状态 |
|---|---|---|---|---|---|
| T-1 | 树 mirror 登记四 ID + REQ-2026-033 锚 | 对齐 | Claude | 0.5h | 完成 |
| T-2 | 登录链测试面（fnTest 锚，stub fetch，覆盖 AC-1~6） | 测试 | Claude | 1.5h | 完成 |
| T-3 | session/store + auth-service 四流程消费面实现 | 实现 | Claude | 1.5h | 完成 |
| T-4 | 全门 L0-L5 + 收链提交 + suite gitlink | 门禁 | Claude | 0.5h | 完成 |

## 4. 功能影响（需求与功能对齐的唯一位置）

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M01.F05.I06 | 原生登录（React Native 消费面） | 新增 | `authNativeLogin` 消费 + 入参装配校验 + 失败清残留 | T-2/T-3 |
| M00.F01.I01 | 当前会话（React Native 消费面） | 新增 | `authGetCurrentUser` 消费，身份/租户回填 | T-2/T-3 |
| M01.F05.I04 | 刷新 token（React Native 消费面） | 新增 | `authRefresh` 消费，token 对轮换 | T-2/T-3 |
| M01.F05.I05 | 登出（React Native 消费面） | 新增 | `authLogout` 消费 + 本地全清 | T-2/T-3 |

## 5. 流程影响

无（RN 仓 flow-function-map 尚无流程面；首片为端到端登录链）。

## 6. 风险与回滚

| 风险 | 影响面 | 缓解 | 回滚方式 |
|---|---|---|---|
| lab native-login 失败形状（非 423 专型，ErrorResponse 泛型）分流错误 | 登录面 | 测试按非 200 统一断言抛错+清残留，不绑具体状态码 | revert 单 commit |
| .env.example 缺省值指错家族端口 | dev 接线 | 本批把缺省改 lab X04 槽 5204 | revert 单 commit |
