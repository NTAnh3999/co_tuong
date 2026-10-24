# CI workflows

## Pull request and push checks

`.github/workflows/ci.yml` builds, lints, typechecks, and tests every workspace package. It also runs `@xq/xiangqi-core`'s configured coverage gate (90% lines/statements/functions and 85% branches). The E2E job starts PostgreSQL 17, creates `xq_test`, applies API migrations, seeds lessons and puzzles with `@xq/content content:seed`, and waits for the real API health endpoint before running the Playwright suite against Chromium. A failed Playwright job uploads its HTML report.

The E2E job uses only the `desktop-chromium` project; mobile Chrome and mobile WebKit remain in the Playwright configuration but are not run by hosted CI. No repository secrets or additional variables are required.

## Nightly engine oracle

`.github/workflows/nightly.yml` downloads the same Pikafish release pinned by `services/pikafish-worker/Dockerfile`, verifies its SHA-256 checksum, and runs the live MultiPV/oracle tests, including curated perft depth-4 comparisons. It runs daily at 04:23 UTC and can also be rerun from GitHub Actions with **Run workflow** (`workflow_dispatch`). It requires no repository secrets.

Coverage thresholds are configured only for `@xq/xiangqi-core`; the all-workspace test run does not impose new coverage thresholds on other packages.
