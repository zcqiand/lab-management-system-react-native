# 功能清单（Function Tree）— Lab 管理系统（React Native 版）

> **全体系唯一锚点。** 需求、流程、设计、测试都引用这里的 ID。
> 不在这里的 ID 是悬空引用，L5 门会拦。**改功能，先改这份表。**

## 编号规则

| 层级 | 名称 | 格式 | 含义 |
|---|---|---|---|
| 一级 | 功能模块 | `M01` | 业务域边界，通常对应一级菜单 |
| 二级 | 功能 | `M01.F01` | 一个完整业务步骤 / 独立闭环流程 / 数据管理页面 |
| 三级 | 功能子项 | `M0x.F0y.I0z` | 技术交付单元 / 权限挂载点。对应一个 API 接口、页面组件、图表区块或权限控制点 |

**硬规则**

1. 编号单调递增，永不复用。废弃改状态，不删行。
2. 子项编号必须以父级为前缀。
3. 一个子项 = 一个权限点。权限码即 ID，不另起一套编码。
4. 拆不出子项的功能 → 它其实是子项，往上并。子项超 20 个 → 它其实是模块，往下拆。

**状态**：`规划` | `开发中` | `已上线` | `已废弃`
**子项类型**：`页面` | `标签页` | `查询` | `按钮` | `报表` | `接口`
**交付**：`前端+后端` | `仅前端` | `仅后端` | `后端`

---

## 模块总览

| 模块 ID | 模块名称 | 说明 | 状态 |
|---|---|---|---|
| M00 | 租户管理 | 当前用户会话 + 选租户/切租户消费（REQ-2026-033 首片 + REQ-2026-037 L-T1） | 开发中 |
| M01 | 认证管理 | 登录链消费面（REQ-2026-033 首片；菜单/权限面后置） | 开发中 |
| M02 | 资源管理 | 合同管理消费面（REQ-2026-037 L-T2 已落地） | 开发中 |
| M03 | 试验过程管理 | 接样流 + 报告流消费面（REQ-2026-037 L-T4/L-T5 已落地） | 开发中 |
| M04 | 基础数据 | 码表四页消费面（REQ-2026-037 L-T3 已落地） | 开发中 |
| M05 | 数据统计 | 报告汇总消费面（REQ-2026-037 L-T6 已落地） | 开发中 |
| M06 | 检测能力 | 检测能力八页消费面（REQ-2026-037 L-T7 已落地） | 开发中 |

---

## M00 租户管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M00.F01 | 当前用户会话 | 当前用户信息 + 关联租户列表 + 当前选中租户 | 开发中 |
| M00.F02 | 登录选租户 | 登录后选择租户，换发携带 tenant_id claim 的 token（L-T1 已落地） | 开发中 |

### M00.F01 当前用户会话

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M00.F01.I01 | 当前会话（React Native 消费面） | 接口 | 前端+后端 | `authGetCurrentUser` 消费 GET /api/auth/me；身份/租户/currentTenantId 回填。测试锚 `tests/auth-chain.test.ts` | 开发中 |

### M00.F02 登录选租户

> 镜像 shared BASE `POST /api/auth/switch-tenant` 消费面（REQ-2026-037 L-T1）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M00.F02.I01 | 选租户换发（React Native 消费面） | 接口 | 前端+后端 | `authSwitchTenant` 消费 POST /api/auth/switch-tenant；`{tenantId}` 换发含 tenant_id claim 新 token 对轮换落 session + 无归属/失败保留既有会话。测试锚 `tests/tenant-switch.test.ts` | 开发中 |

---

## M01 认证管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M01.F04 | 权限管理 | RBAC/路由守卫/动态菜单（身份平台下发）消费面（REQ-2026-037 另片挂账） | 规划 |
| M01.F05 | 认证管理 | 原生登录 / 刷新 / 登出（SSO 浏览器流不适用原生客户端，不登记） | 开发中 |

### M01.F05 认证管理

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M01.F05.I06 | 原生登录（React Native 消费面） | 接口 | 前端+后端 | `authNativeLogin` 消费 POST /api/auth/native-login（saas IdP 代理，REQ-2026-023 方案 A）；入参装配 fail-fast + 非 200 清残留。测试锚 `tests/login-form.test.ts`、`tests/auth-chain.test.ts` | 开发中 |
| M01.F05.I04 | 刷新 token（React Native 消费面） | 接口 | 前端+后端 | `authRefresh` 消费 POST /api/auth/refresh；token 对轮换，失败清会话抛错。测试锚 `tests/auth-chain.test.ts` | 开发中 |
| M01.F05.I05 | 登出（React Native 消费面） | 接口 | 前端+后端 | `authLogout` 消费 POST /api/auth/logout（body={token}）+ 本地全清。测试锚 `tests/auth-chain.test.ts` | 开发中 |

（M01.F04 权限管理已规划态登记（REQ-2026-037），消费实现随导航切片另片；登录页 UI 随 native 工程面落地另片——REQ-2026-033 §1 范围外。M01.F01/M01.F01.I01 为 init 模板占位残留，lab shared 无此 ID，本片随授权编辑删除——harmonyos 首片同先例。）

---

## M02 资源管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M02.F01 | 合同管理 | 合同 CRUD、工程信息维护消费面（L-T2 已落地） | 开发中 |

### M02.F01 合同管理

> 镜像 shared BASE `/api/contracts` 消费面（REQ-2026-037 L-T2）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M02.F01.I01 | 合同列表（React Native 消费面） | 接口 | 前端+后端 | `contractsListContracts` 消费 GET /api/contracts；keyword/status 过滤 + 回显全量信封（op 级 @doc 定稿）。测试锚 `tests/contract.test.ts` | 开发中 |
| M02.F01.I02 | 合同详情（React Native 消费面） | 接口 | 前端+后端 | `contractsGetContract` 消费 GET /api/contracts/{id}；404 无此合同分流。测试锚 `tests/contract.test.ts` | 开发中 |
| M02.F01.I03 | 创建合同（React Native 消费面） | 接口 | 前端+后端 | `contractsCreateContract` 消费 POST /api/contracts；六必填装配 fail-fast（status 服务端默认）。测试锚 `tests/contract.test.ts` | 开发中 |
| M02.F01.I04 | 更新合同（React Native 消费面） | 接口 | 前端+后端 | `contractsUpdateContract` 消费 PUT /api/contracts/{id}；PATCH 语义部分载荷（空载荷禁发）。测试锚 `tests/contract.test.ts` | 开发中 |
| M02.F01.I05 | 删除合同（React Native 消费面） | 接口 | 前端+后端 | `contractsDeleteContract` 消费 DELETE /api/contracts/{id}；204→undefined。测试锚 `tests/contract.test.ts` | 开发中 |

---

## M03 试验过程管理

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M03.F01 | 接样管理 | 接样单 CRUD、报告类别关联、流程状态消费面（L-T4 已落地） | 开发中 |
| M03.F02 | 任务分配 | 接样提交后安排检测人员/计划日期，提交进入数据录入（L-T4 已落地） | 开发中 |
| M03.F03 | 数据录入 | 样品检测数据录入消费面（L-T4 已落地） | 开发中 |
| M03.F05 | 报告审核 | 报告审核流程消费面（L-T5） | 开发中 |
| M03.F06 | 报告批准 | 报告批准流程消费面（L-T5） | 开发中 |
| M03.F07 | 报告发放 | 报告发放流程消费面（L-T5） | 开发中 |
| M03.F08 | 报告归档 | 报告归档流程消费面（L-T5） | 开发中 |
| M03.F09 | 接样单详情 | 接样单查看（接样信息+样品信息+检测数据）消费面（L-T5） | 开发中 |

### M03.F01 接样管理

> 镜像 shared BASE `/api/receipts` + `/api/samples/{id}/ext` 消费面（REQ-2026-037 L-T4）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F01.I01 | 接样单列表（React Native 消费面） | 接口 | 前端+后端 | `receiptsListReceipts` 消费 GET /api/receipts；contractId/flowStatus/keyword 过滤 + 回显全量信封。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I02 | 接样单详情（React Native 消费面） | 接口 | 前端+后端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（含 flowHistory）；404 无此接样单分流。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I03 | 创建接样单（React Native 消费面） | 接口 | 前端+后端 | `receiptsCreateReceipt` 消费 POST /api/receipts；七必填装配 fail-fast（ADR-0019）。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I04 | 更新接样单（React Native 消费面） | 接口 | 前端+后端 | `receiptsUpdateReceipt` 消费 PUT /api/receipts/{id}；PATCH 语义部分载荷（空载荷禁发）。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I05 | 删除接样单（React Native 消费面） | 接口 | 前端+后端 | `receiptsDeleteReceipt` 消费 DELETE /api/receipts/{id}；204→undefined，404 分流。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I06 | 接样单流程历史（React Native 消费面） | 接口 | 前端+后端 | `receiptsGetReceiptHistory` 消费 GET /api/receipts/{id}/history；FlowHistoryEntry[]。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F01.I07 | 接样单 ext 字段补录（React Native 消费面） | 接口 | 前端+后端 | `samplesUpdateSampleExt` 消费 PUT /api/samples/{id}/ext；{ext} 包装载荷 + 空 ext 禁发。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F01.I08 | 接样-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowReceiving` 消费 POST /api/receipts/receiving/act；body.action 三动作统一，operator 会话注入，ids 空/无效动作 fail-fast。测试锚 `tests/receipts.test.ts` | 开发中 |

### M03.F02 任务分配

> 镜像 shared BASE `/api/receipts/{id}/task` + `/api/receipts/assigning/act` 消费面（REQ-2026-037 L-T4）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F02.I01 | 任务分配（React Native 消费面） | 接口 | 前端+后端 | `receiptsAssignTask` 消费 PUT /api/receipts/{id}/task；assigneeId/assigneeName/plannedTestDate 三字段。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F02.I04 | 任务分配三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前阶段/下一阶段/全部），镜像 react 仓 ReceiptsList 惯例。测试锚 `tests/receipts.test.ts` | 开发中 |
| M03.F02.I05 | 任务分配-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowAssigning` 消费 POST /api/receipts/assigning/act；三动作统一。测试锚 `tests/receipts.test.ts` | 开发中 |

### M03.F03 样品与检测记录

> 镜像 shared BASE `/api/samples` + `/api/test-records` + `/api/receipts/data-entry/act` 消费面（REQ-2026-037 L-T4）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F03.I01 | 样品列表（React Native 消费面） | 接口 | 前端+后端 | `samplesListSamples` 消费 GET /api/samples；receiptId/keyword 过滤 + 回显全量信封。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F03.I02 | 样品详情（React Native 消费面） | 接口 | 前端+后端 | `samplesGetSample` 消费 GET /api/samples/{id}；含 ext 扩展字段。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F03.I03 | 创建样品（React Native 消费面） | 接口 | 前端+后端 | `samplesCreateSample` 消费 POST /api/samples；receiptId/sampleCode 必填 fail-fast（ADR-0019）。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F03.I04 | 更新样品（React Native 消费面） | 接口 | 前端+后端 | `samplesUpdateSample` 消费 PUT /api/samples/{id}；PATCH 语义部分载荷（空载荷禁发）。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F03.I05 | 删除样品（React Native 消费面） | 接口 | 前端+后端 | `samplesDeleteSample` 消费 DELETE /api/samples/{id}；204→undefined。测试锚 `tests/samples.test.ts` | 开发中 |
| M03.F03.I06 | 检测记录列表（React Native 消费面） | 接口 | 前端+后端 | `testRecordsListTestRecords` 消费 GET /api/test-records；sampleId/parameterCode 过滤 + 回显全量信封。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I07 | 检测记录详情（React Native 消费面） | 接口 | 前端+后端 | `testRecordsGetTestRecord` 消费 GET /api/test-records/{id}；含 verdict。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I08 | 创建检测记录（React Native 消费面） | 接口 | 前端+后端 | `testRecordsCreateTestRecord` 消费 POST /api/test-records；sampleId/parameterCode/requirement/result 四必填 fail-fast（ADR-0019）。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I09 | 更新检测记录（React Native 消费面） | 接口 | 前端+后端 | `testRecordsUpdateTestRecord` 消费 PUT /api/test-records/{id}；PATCH 语义部分载荷（空载荷禁发）。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I10 | 删除检测记录（React Native 消费面） | 接口 | 前端+后端 | `testRecordsDeleteTestRecord` 消费 DELETE /api/test-records/{id}；204→undefined。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I11 | 检测记录改判（React Native 消费面） | 接口 | 前端+后端 | `testRecordsSetVerdict` 消费 PATCH /api/test-records/{id}/verdict；verdict 空禁发 fail-fast，200 TestRecord。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I12 | 数据录入-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowDataEntry` 消费 POST /api/receipts/data-entry/act；三动作统一，operator 会话注入。测试锚 `tests/test-records.test.ts` | 开发中 |
| M03.F03.I15 | 数据录入三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前/下一阶段/全部），re-export 自 receipts。测试锚 `tests/test-records.test.ts` | 开发中 |

### M03.F05 报告审核

> 镜像 shared BASE `/api/receipts/review/act` 消费面（REQ-2026-037 L-T5）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F05.I02 | 报告审核-查看详情（React Native 消费面） | 按钮 | 仅前端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（F01.I02 共端点）。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F05.I04 | 报告审核三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前/下一阶段/全部），review→approval。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F05.I07 | 报告审核-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowReview` 消费 POST /api/receipts/review/act；三动作统一，operator 会话注入。测试锚 `tests/report-flow.test.ts` | 开发中 |

### M03.F06 报告批准

> 镜像 shared BASE `/api/receipts/approve/act` 消费面（REQ-2026-037 L-T5）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F06.I02 | 报告批准-查看详情（React Native 消费面） | 按钮 | 前端+后端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（F01.I02 共端点）。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F06.I04 | 报告批准三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前/下一阶段/全部），approval→issuance。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F06.I05 | 报告批准-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowApprove` 消费 POST /api/receipts/approve/act；三动作统一，operator 会话注入。测试锚 `tests/report-flow.test.ts` | 开发中 |

### M03.F07 报告发放

> 镜像 shared BASE `/api/receipts/issuance/act` 消费面（REQ-2026-037 L-T5）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F07.I02 | 报告发放-查看详情（React Native 消费面） | 按钮 | 前端+后端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（F01.I02 共端点）。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F07.I04 | 报告发放三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前/下一阶段/全部），issuance→archived。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F07.I05 | 报告发放-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowIssuance` 消费 POST /api/receipts/issuance/act；三动作统一，operator 会话注入。测试锚 `tests/report-flow.test.ts` | 开发中 |

### M03.F08 报告归档

> 镜像 shared BASE `/api/receipts/archived/act` 消费面（REQ-2026-037 L-T5）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F08.I02 | 报告归档-查看详情（React Native 消费面） | 按钮 | 前端+后端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（F01.I02 共端点）。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F08.I04 | 报告归档三态过滤器（React Native 消费面） | 按钮 | 仅前端 | `flowStatusForFilter` 三态（当前/下一阶段/全部），archived→completed。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F08.I05 | 报告归档-提交（React Native 消费面） | 接口 | 前端+后端 | `receiptsActFlowArchived` 消费 POST /api/receipts/archived/act；三动作统一，operator 会话注入。测试锚 `tests/report-flow.test.ts` | 开发中 |

### M03.F09 接样单详情

> 镜像 shared BASE GET /api/receipts/{id} 详情共端点 消费面（REQ-2026-037 L-T5）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M03.F09.I01 | 接样单详情聚合（React Native 消费面） | 接口 | 前端+后端 | `receiptsGetReceipt` 消费 GET /api/receipts/{id}（F01.I02 共端点，聚合 flowHistory）。测试锚 `tests/report-flow.test.ts` | 开发中 |
| M03.F09.I03 | 报告预览（React Native 消费面） | 按钮 | 仅前端 | 纯视图派生 `buildReportPreview(receipt)`：categoryCode 定位报告模板，reportCode 可空，缺失 fail-fast（ADR-0019）。测试锚 `tests/report-flow.test.ts` | 开发中 |

---

## M04 基础数据

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M04.F06 | 型号维护 | InspectionModel 实体码表维护消费面，列表按检测专项过滤（L-T3 已落地） | 开发中 |
| M04.F07 | 规格维护 | InspectionSpec 实体码表维护消费面，列表按检测专项过滤（L-T3 已落地） | 开发中 |
| M04.F08 | 等级维护 | InspectionGrade 实体码表维护消费面，列表按检测专项过滤（L-T3 已落地） | 开发中 |
| M04.F09 | 牌号维护 | InspectionBrand 实体码表维护消费面，列表按检测专项过滤（L-T3 已落地） | 开发中 |

### M04.F06 型号维护

> 镜像 shared BASE `/api/catalog/models` 消费面（REQ-2026-037 L-T3）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F06.I01 | 型号列表（React Native 消费面） | 接口 | 前端+后端 | `catalogListModels` 消费 GET /api/catalog/models；inspectionObjectCode/keyword 过滤 + 回显全量信封（op 级 @doc 定稿）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F06.I02 | 创建型号（React Native 消费面） | 接口 | 前端+后端 | `catalogCreateModel` 消费 POST /api/catalog/models；code/name 必填装配 fail-fast（ADR-0019）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F06.I03 | 更新型号（React Native 消费面） | 接口 | 前端+后端 | `catalogUpdateModel` 消费 PUT /api/catalog/models/{code}；body 全可选、code 主键不可变（空载荷禁发）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F06.I04 | 删除型号（React Native 消费面） | 接口 | 前端+后端 | `catalogDeleteModel` 消费 DELETE /api/catalog/models/{code}；204→undefined。测试锚 `tests/catalog.test.ts` | 开发中 |

### M04.F07 规格维护

> 镜像 shared BASE `/api/catalog/specs` 消费面（REQ-2026-037 L-T3）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F07.I01 | 规格列表（React Native 消费面） | 接口 | 前端+后端 | `catalogListSpecs` 消费 GET /api/catalog/specs；过滤 + 回显全量信封。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F07.I02 | 创建规格（React Native 消费面） | 接口 | 前端+后端 | `catalogCreateSpec` 消费 POST /api/catalog/specs；code/name 必填装配 fail-fast（ADR-0019）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F07.I03 | 更新规格（React Native 消费面） | 接口 | 前端+后端 | `catalogUpdateSpec` 消费 PUT /api/catalog/specs/{code}；body 全可选（空载荷禁发）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F07.I04 | 删除规格（React Native 消费面） | 接口 | 前端+后端 | `catalogDeleteSpec` 消费 DELETE /api/catalog/specs/{code}；204→undefined。测试锚 `tests/catalog.test.ts` | 开发中 |

### M04.F08 等级维护

> 镜像 shared BASE `/api/catalog/grades` 消费面（REQ-2026-037 L-T3）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F08.I01 | 等级列表（React Native 消费面） | 接口 | 前端+后端 | `catalogListGrades` 消费 GET /api/catalog/grades；过滤 + 回显全量信封。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F08.I02 | 创建等级（React Native 消费面） | 接口 | 前端+后端 | `catalogCreateGrade` 消费 POST /api/catalog/grades；code/name 必填装配 fail-fast（ADR-0019）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F08.I03 | 更新等级（React Native 消费面） | 接口 | 前端+后端 | `catalogUpdateGrade` 消费 PUT /api/catalog/grades/{code}；body 全可选（空载荷禁发）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F08.I04 | 删除等级（React Native 消费面） | 接口 | 前端+后端 | `catalogDeleteGrade` 消费 DELETE /api/catalog/grades/{code}；204→undefined。测试锚 `tests/catalog.test.ts` | 开发中 |

### M04.F09 牌号维护

> 镜像 shared BASE `/api/catalog/brands` 消费面（REQ-2026-037 L-T3）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M04.F09.I01 | 牌号列表（React Native 消费面） | 接口 | 前端+后端 | `catalogListBrands` 消费 GET /api/catalog/brands；过滤 + 回显全量信封。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F09.I02 | 创建牌号（React Native 消费面） | 接口 | 前端+后端 | `catalogCreateBrand` 消费 POST /api/catalog/brands；code/name 必填装配 fail-fast（ADR-0019）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F09.I03 | 更新牌号（React Native 消费面） | 接口 | 前端+后端 | `catalogUpdateBrand` 消费 PUT /api/catalog/brands/{code}；body 全可选（空载荷禁发）。测试锚 `tests/catalog.test.ts` | 开发中 |
| M04.F09.I04 | 删除牌号（React Native 消费面） | 接口 | 前端+后端 | `catalogDeleteBrand` 消费 DELETE /api/catalog/brands/{code}；204→undefined。测试锚 `tests/catalog.test.ts` | 开发中 |

---

## M05 数据统计

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M05.F01 | 报告汇总 | 按报告类别输出试验报告汇总表消费面（L-T6） | 开发中 |

### M05.F01 报告汇总

> 镜像 shared BASE `/api/summary` + `/api/summary/stats` 消费面（REQ-2026-037 L-T6）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M05.F01.I01 | 报告汇总表（按报告类别汇总）（React Native 消费面） | 查询 | 前端+后端 | `summaryGetReportSummary` 消费 GET /api/summary；categoryCode=ALL 不过滤/dateFrom/dateTo 直传，200 SummaryData{summaryName,columns,rows}。测试锚 `tests/summary.test.ts` | 开发中 |
| M05.F01.I02 | 仪表盘统计（React Native 消费面） | 查询 | 仅前端 | `buildDashboardCards` 纯视图派生（四基数卡：合同/接样单/样品/待办任务）。测试锚 `tests/summary.test.ts` | 开发中 |
| M05.F01.I03 | 核心指标卡（React Native 消费面） | 查询 | 前端+后端 | `buildCoreCards` 派生 todayTestCount + qualifiedRateByMaterial + reportOutputByStatus（stats 扩展字段）。测试锚 `tests/summary.test.ts` | 开发中 |
| M05.F01.I04 | 任务状态漏斗（React Native 消费面） | 报表 | 前端+后端 | `buildFunnel` 派生六段顺序（pending_collect→received→testing→reporting→reviewing→issued）+ `summaryGetDashboardStats` 消费 funnelByStage。测试锚 `tests/summary.test.ts` | 开发中 |
| M05.F01.I06 | 仪表盘统计基础端点（React Native 消费面） | 查询 | 前端+后端 | `summaryGetDashboardStats` 消费 GET /api/summary/stats；基础四计数 + reportCountByStatus 三桶（draft/reviewing/issued）+ pendingTaskCount。测试锚 `tests/summary.test.ts` | 开发中 |

---

## M06 检测能力

| 功能 ID | 功能名称 | 说明 | 状态 |
|---|---|---|---|
| M06.F01 | 检测专项 | InspectionSpecialty CRUD 消费面（L-T7） | 开发中 |
| M06.F02 | 检测项目 | InspectionObject CRUD + 专项/参数关联消费面（L-T7） | 开发中 |
| M06.F03 | 检测参数 | InspectionParameter CRUD + 标准/参数关联消费面（L-T7） | 开发中 |
| M06.F04 | 检测标准 | InspectionStandard CRUD 消费面（含状态：active/superseded/draft）（L-T7） | 开发中 |
| M06.F05 | 计算方法 | CalculationMethod 维护消费面（复合主键，算法类型 + 公式）（L-T7） | 开发中 |
| M06.F06 | 技术要求 | TechnicalRequirement 维护消费面，按四维度匹配（L-T7） | 开发中 |
| M06.F07 | 报告名称 | InspectionReportName CRUD + extFields 模板消费面（L-T7） | 开发中 |
| M06.F08 | 参数界面 | ParamInterface 维护 + 参数↔界面 link 消费面（L-T7） | 开发中 |


### M06.F01 检测专项

> 镜像 shared BASE `/api/inspection/specialties` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F01.I01 | 专项列表（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryListSpecialties` 消费 GET /api/inspection/specialties?page=&pageSize=&keyword=；`Page<InspectionSpecialty>`，按 code/name 模糊匹配，平台级。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F01.I02 | 创建专项（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryCreateSpecialty` 消费 POST /api/inspection/specialties；code/officialNo/name 必填；isOfficial/enabled 默认 true；sortOrder 默认 0。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F01.I03 | 更新专项（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryUpdateSpecialty` 消费 PUT /api/inspection/specialties/{code}；PATCH 语义，未传字段保留。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |

### M06.F02 检测项目

> 镜像 shared BASE `/api/inspection/objects + /api/inspection/links/*` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F02.I01 | 项目列表（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryListObjects` 消费 GET /api/inspection/objects?page=&pageSize=&inspectionSpecialtyCode=&keyword=；`Page<InspectionObject>`，按 code/name 模糊 + 专项过滤。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I02 | 创建项目（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryLinkSpecialtyObject` 消费 POST /api/inspection/objects；code/inspectionSpecialtyCode/sourceProjectNo/sourceProjectName/name 必填；isOptionalForQualification 默认 false；isOfficial/enabled 默认 true。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I03 | 更新项目（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryUpdateObject` 消费 PUT /api/inspection/objects/{code}；PATCH 语义。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I04 | 删除项目（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryDeleteObject` 消费 DELETE /api/inspection/objects/{code}；204 if exists。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I05 | 专项↔项目 link（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryLinkSpecialtyObject` 消费 POST /api/inspection/links/specialty-object；建立 specialty→object 关联，remark 可选。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I06 | 专项↔项目 unlink（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryUnlinkSpecialtyObject` 消费 DELETE /api/inspection/links/specialty-object；404 if 不存在。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F02.I07 | 项目↔参数 link（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryLinkObjectParameter` 消费 POST /api/inspection/links/object-parameter；建立 object→parameter 关联，qualificationLevel 默认 QUALIFIED，sourcePage/remark 可选。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |

### M06.F03 检测参数

> 镜像 shared BASE `/api/inspection/parameters + /api/inspection/links/standard-parameter` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F03.I01 | 参数列表（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryListParameters` 消费 GET /api/inspection/parameters?page=&pageSize=&keyword=&sourceType=；`Page<InspectionParameter>`，按 code/name 模糊 + sourceType 过滤（official/custom）。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F03.I02 | 创建参数（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryLinkStandardParameter` 消费 POST /api/inspection/parameters；code/name/rawName/canonicalName 必填；sourceType 默认 OFFICIAL；aliases 默认 []。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F03.I03 | 更新参数（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryUpdateParameter` 消费 PUT /api/inspection/parameters/{code}；PATCH 语义；aliases 传则整体替换。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |

### M06.F04 检测标准

> 镜像 shared BASE `/api/inspection/standards` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F04.I01 | 标准列表（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryListStandards` 消费 GET /api/inspection/standards?page=&pageSize=&keyword=&status=；`Page<InspectionStandard>`，按 code/name 模糊 + status 过滤（active/superseded/draft）。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F04.I02 | 创建标准（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryCreateStandard` 消费 POST /api/inspection/standards；code/name 必填；status 默认 ACTIVE。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F04.I03 | 更新标准（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryUpdateStandard` 消费 PUT /api/inspection/standards/{code}；PATCH 语义。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |
| M06.F04.I04 | 删除标准（React Native 消费面） | 接口 | 前端+后端 | `inspectionDictionaryDeleteStandard` 消费 DELETE /api/inspection/standards/{code}；204 if exists。测试锚 `tests/inspection-dictionary.test.ts` | 开发中 |

### M06.F05 计算方法

> 镜像 shared BASE `/api/calculation-methods` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F05.I01 | 计算方法列表（React Native 消费面） | 接口 | 前端+后端 | `calculationMethodsListCalculationMethods` 消费 GET /api/calculation-methods?inspectionObjectCode=&inspectionParameterCode=；平台级（无 tenant 过滤）。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F05.I02 | 计算方法详情（React Native 消费面） | 接口 | 前端+后端 | `calculationMethodsGetCalculationMethod` 消费 GET /api/calculation-methods/{inspectionObjectCode}/{inspectionParameterCode}；复合主键。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F05.I03 | 创建计算方法（React Native 消费面） | 接口 | 前端+后端 | `calculationMethodsCreateCalculationMethod` 消费 POST /api/calculation-methods；body CreateCalculationMethodRequest，algorithmType 默认 MANUAL、specimenCount 默认 1。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |

### M06.F06 技术要求

> 镜像 shared BASE `/api/technical-requirements` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F06.I01 | 技术要求列表（React Native 消费面） | 接口 | 前端+后端 | `technicalRequirementsListTechnicalRequirements` 消费 GET /api/technical-requirements?inspectionObjectCode=&inspectionParameterCode=&judgmentStandardCode=&verificationStatus=；tenant 收口 + 4 过滤。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F06.I02 | 技术要求详情（React Native 消费面） | 接口 | 前端+后端 | `technicalRequirementsCreateTechnicalRequirement` 消费 GET /api/technical-requirements/{object}/{param}/{standard}；复合三键。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F06.I03 | 创建技术要求（React Native 消费面） | 接口 | 前端+后端 | `technicalRequirementsCreateTechnicalRequirement` 消费 POST /api/technical-requirements；tenant 从 token claim 注入；默认值 numeric/≥/manual/draft。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F06.I04 | 更新技术要求（React Native 消费面） | 接口 | 前端+后端 | `technicalRequirementsUpdateTechnicalRequirement` 消费 PUT /api/technical-requirements/{...}；PATCH 语义。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |
| M06.F06.I05 | 删除技术要求（React Native 消费面） | 接口 | 前端+后端 | `technicalRequirementsDeleteTechnicalRequirement` 消费 DELETE /api/technical-requirements/{...}；204。测试锚 `tests/calculation-techreq.test.ts` | 开发中 |

### M06.F07 报告名称

> 镜像 shared BASE `/api/report-names + /api/report-names/links/*` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F07.I01 | 报告名称列表（React Native 消费面） | 接口 | 前端+后端 | `reportNamesListReportNames` 消费 GET /api/report-names?page=&pageSize=&keyword=；`Page<InspectionReportName>`，按 code/name 模糊。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I02 | 报告名称详情（React Native 消费面） | 接口 | 前端+后端 | `reportNamesLinkReportNameStandard` 消费 GET /api/report-names/{code}；返回 InspectionReportName（含 extFields 反序列化的 `List<ExtFieldDef>`）。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I03 | 创建报告名称（React Native 消费面） | 接口 | 前端+后端 | `reportNamesCreateReportName` 消费 POST /api/report-names；code/name 必填；extFields 默认 []。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I04 | 更新报告名称（React Native 消费面） | 接口 | 前端+后端 | `reportNamesUpdateReportName` 消费 PUT /api/report-names/{code}；PATCH 语义。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I05 | 删除报告名称（React Native 消费面） | 接口 | 前端+后端 | `reportNamesDeleteReportName` 消费 DELETE /api/report-names/{code}；204 if exists。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I06 | 项目↔报告名称 link（React Native 消费面） | 接口 | 前端+后端 | `reportNamesLinkObjectReportName` 消费 POST /api/report-names/links/object；建立 object→report-name 关联，remark 可选。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I07 | 报告名称↔标准 link（React Native 消费面） | 接口 | 前端+后端 | `reportNamesLinkReportNameStandard` 消费 POST /api/report-names/links/standard；建立 report-name→standard(role) 关联，role 必填。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F07.I08 | 报告名称↔参数 link（React Native 消费面） | 接口 | 前端+后端 | `reportNamesLinkReportNameParameter` 消费 POST /api/report-names/links/parameter；建立 report-name→parameter 关联。测试锚 `tests/report-names-params.test.ts` | 开发中 |

### M06.F08 参数界面

> 镜像 shared BASE `/api/param-interfaces + /api/param-interfaces/links` 消费面（REQ-2026-037 L-T7）。

| 子项 ID | 名称 | 类型 | 交付 | 说明 | 状态 |
|---|---|---|---|---|---|
| M06.F08.I01 | 参数界面列表（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesListParamInterfaces` 消费 GET /api/param-interfaces?page=&pageSize=&keyword=；`Page<ParamInterface>`，按 code/name 模糊。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F08.I02 | 参数界面详情（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesGetParamInterface` 消费 GET /api/param-interfaces/{code}；返回 ParamInterface（含 config 反序列化的 Map<String,Object>）。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F08.I03 | 创建参数界面（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesCreateParamInterface` 消费 POST /api/param-interfaces；code/componentPath 必填；config 默认 {}。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F08.I04 | 更新参数界面（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesUpdateParamInterface` 消费 PUT /api/param-interfaces/{code}；PATCH 语义。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F08.I05 | 删除参数界面（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesDeleteParamInterface` 消费 DELETE /api/param-interfaces/{code}；204 if exists。测试锚 `tests/report-names-params.test.ts` | 开发中 |
| M06.F08.I06 | 参数↔界面 link（React Native 消费面） | 接口 | 前端+后端 | `paramInterfacesLinkParamInterface` 消费 POST /api/param-interfaces/links；建立 parameter→interface 关联，reportNameCode/config 可选（config 走 jsonb）。测试锚 `tests/report-names-params.test.ts` | 开发中 |

---

## 已废弃功能子项

> 所有 `已废弃` / `已迁移` 状态的功能子项统一汇总到这里，**按子项 ID 顺序排列**。
> 模块级（F 级及以上）的已废弃 / 已迁移状态保留在各模块章节内说明；本节只收 I 级。
>
> 列字段说明：
> - **模块归属**：该 I 所属 F 所在模块（用于跨模块检索）
> - **迁移去向**：若为「已迁移」，标注新 ID；若为「已废弃」，说明废弃原因

| 子项 ID | 名称 | 模块归属 | 迁移去向 | 状态 |
|---|---|---|---|---|

（暂无。登记示例：`| M03.F02.I01 | 旧角色 CRUD 列表 | M03 角色权限 | → M04.F01.I02（新结构） | 已迁移 |` ——
示例 ID 仅示意格式，勿与活跃段 ID 重复，否则 L5 报「编号永不复用」）

---

## 维护约定

- 谁改功能，谁改表，同一个 commit。
- `规划` → `开发中`：必须先有需求文档引用它。
- `开发中` → `已上线`：L5 会警告它缺设计映射与测试引用。警告不阻断，由人裁量。
- **已废弃 / 已迁移 I 级子项**：从原 F 段移到「已废弃功能子项」段，不删除行；F 级保留在新结构下。
