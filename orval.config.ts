import { basename, resolve } from "node:path";
import { defineConfig } from "orval";

// orval config（react-native 仓）——从家族 shared 仓的 OpenAPI.yaml 生成 TS api client。
//
// 与家族 react/vue/nextjs 仓同配方（tags-split + clean + model/ 集中），差异两处：
//   - client: "fetch" + mutator（RN 无 react-query 接线需求，fetch RN 原生可用；
//     mutator=src/api/mutator.ts 统一注入基址，见该文件头注）
//   - input 路径运行时推导：本仓名 -react-native 后缀换 -shared（家族内唯一分叉点，
//     saas/lab 双家族共用本文件零改）
const root = process.cwd();
const repoName = basename(root);
const sharedDirName = repoName.replace(/-react-native$/, "-shared");

if (sharedDirName === repoName) {
  throw new Error(`[orval] 仓名须以 -react-native 结尾（家族 shared 仓推导失败）: ${repoName}`);
}

export default defineConfig({
  api: {
    input: resolve(root, "..", sharedDirName, "generated/openapi/openapi.yaml"),
    output: {
      mode: "tags-split",
      target: "./src/api/endpoints",
      schemas: "./src/api/endpoints/model",
      // clean：生成前清空目标目录（react 仓 2026-09-17 SSOT 清理同款）——tags-split
      // 不会删除已从契约移除的 tag 旧目录/旧模型。整个 endpoints/ 目录必须保持
      // orval-owned：手写层只有 src/api/mutator.ts，不得混进本目录。
      clean: ["./src/api/endpoints"],
      client: "fetch",
      override: {
        useDates: false,
        mutator: { path: "./src/api/mutator.ts", name: "customFetch" },
      },
    },
  },
});
