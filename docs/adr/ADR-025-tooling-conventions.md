# ADR-025: Tooling Conventions (Housekeeping)

**ADR-ID:** ADR-025  
**Ngày:** 2026-10-24  
**Trạng thái:** Proposed  

## Vấn đề

Cần thống nhất các quy ước tooling và development stack xuyên suốt codebase để đảm bảo consistency, dễ bảo trì, và giảm quyết định ad-hoc.

## Bối cảnh

Dự án sử dụng monorepo, multiple packages, cả Next.js (ESM) và NestJS (CJS). Cần rõ ràng về:
- Package scope (naming convention).
- Module format (ESM vs. CJS).
- Runtime validation library (Zod, Joi, io-ts, ...).
- Test runners (Vitest, Jest, ...).
- E2E testing (Playwright, Cypress, ...).
- Toolchain (TypeScript strictness, linting, etc.).

## Các lựa chọn

1. **Ad-hoc choices:** Mỗi package tự chọn tool → inconsistent, khó maintain.
2. **Single stack:** Chọn một tool cho mỗi category (scope, validation, test) → simple, enforced.
3. **Flexible with guardrails:** Prefer single option nhưng allow override nếu justify → balance.

## Quyết định

Chọn **single stack + enforced convention**. Không allow override nếu không có rất good reason.

### Stack

**Package scope:**
- All internal packages: `@xq/*` (e.g., `@xq/xiangqi-core`, `@xq/api-client`, `@xq/shared-contracts`)
- External dependencies (3rd party): standard npm scope

**Build output:**
- Internal packages build **dual ESM + CJS** output:
  - NestJS requires CJS (decorator metadata).
  - Next.js/modern tooling prefer ESM.
  - Use `tsup` or `swc` + dual entry points (`main`, `module` in package.json).
  - Generate both `.cjs` và `.mjs` dist files or one bundle per format.

**Runtime validation:**
- **Zod** is the sole runtime schema/validation library.
- Why: TypeScript-first, small bundle, works isomorphic, good TS inference, standard for this stack.
- Ban: Joi, io-ts, yup, superstruct, etc.
- Apply: Request/response contracts, form data, API schemas, environment vars.

**Testing:**

*Unit/integration:*
- **Vitest** (not Jest).
- Why: ESM-native, faster, works with TypeScript strict mode.
- Use `unplugin-swc` to handle NestJS decorator metadata during test.
- Ban: Jest, mocha, lab.

*E2E (apps/web only):*
- **Playwright** (not Cypress).
- Why: Cross-browser, works headless in CI, stable.
- Ban: Cypress, Puppeteer raw.

*Performance/load testing (post-MVP):*
- k6 or similar (defer to ADR after M2).

**TypeScript strictness:**
- `strict: true` in tsconfig.json (entire codebase).
- `noUncheckedIndexedAccess: true` (safer array/object access).
- `verbatimModuleSyntax: true` (explicit type imports).
- No `@ts-ignore`, `@ts-expect-error`, or `any` without documented justification (code review).

**Linting:**
- ESLint (already established).
- ESLint boundary rules enforce `xiangqi-core` has no DOM, Node, network, or DB import.
- Prettier for formatting.

**Version management:**
- SemVer for packages.
- Pin Pikafish to specific release tag (not `latest`).
- pnpm lockfile (already in use).

## Lý do

- **Consistency:** Everyone uses same tools → same mental model → easier code review.
- **Type safety:** TypeScript strict mode + Zod + Vitest = confidence.
- **ESM/CJS dual output:** Necessary for monorepo (NestJS CJS, Next.js ESM).
- **Vitest + unplugin-swc:** Only way to handle NestJS decorators under Vitest without jest-metadata.
- **Zod:** Best-in-class for TypeScript validation; no other library matches feature/ergonomics combo.
- **Playwright:** Industry standard for E2E, more reliable than Cypress for this use case.
- **Boundary rules:** Enforce clean architecture, prevent tight coupling.

## Hệ quả / trade-offs

**Lợi ích:**
- Clear, documented standard.
- Easier onboarding (no "should we use Jest or Vitest?" debates).
- Type-safe everywhere.
- Small bundle size (Zod, Vitest compact).

**Tradeoff:**
- Developers familiar with Jest/Cypress must learn Vitest/Playwright (minor, tools are similar).
- No flexibility for special cases (intentional; reduces decision fatigue).
- Zod has learning curve for some (compact but powerful API).

## Phạm vi thay đổi code/UX/QA

**Code:**
- Enforce scope `@xq/*` on internal packages (linter rule).
- Configure build output (tsup/swc dual ESM+CJS).
- Add Zod schemas for all API contracts.
- Vitest config: Setup unplugin-swc for NestJS.
- ESLint boundary rules already in place; reinforce.

**Setup:**
- pnpm-workspace.yaml: scope filter.
- turbo.json: Align build/test/lint tasks.
- GitHub Actions: Run Vitest + Playwright in CI.

**QA:**
- All new packages must follow `@xq/*` scope.
- All validation must use Zod (no exceptions).
- All unit tests must use Vitest.
- All E2E tests (web) must use Playwright.

## Tài liệu liên quan

- Project AGENTS.md (this file referenced in section "Conventions").
- CLAUDE.md (same info).

## Người duyệt

Chưa duyệt — chờ xác nhận trước M7
