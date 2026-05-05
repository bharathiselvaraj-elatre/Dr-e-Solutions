# Project Root

Playwright + Cucumber test automation project structure:

```text
project-root/
|-- package.json
|-- playwright.config.ts
|-- tsconfig.json
|
|-- features/
|   |-- flows/
|   |   |-- full-positive-flow.feature
|   |   `-- full-negative-flow.feature
|   |
|   |-- auth/
|   |   |-- login.feature
|   |   `-- logout.feature
|   |
|   |-- branch/
|   |   `-- branch.feature
|   |
|   |-- users/
|   |   `-- users.feature
|   |
|   |-- board/
|   |   `-- board.feature
|   |
|   `-- leads/
|       `-- leads.feature
|
|-- src/
|   |-- pages/
|   |   |-- LoginPage.ts
|   |   |-- DashboardPage.ts
|   |   |-- BranchPage.ts
|   |   |-- UsersPage.ts
|   |   |-- BoardPage.ts
|   |   |-- LeadsPage.ts
|   |   `-- LogoutPage.ts
|   |
|   |-- step-definitions/
|   |   |-- auth.steps.ts
|   |   |-- branch.steps.ts
|   |   |-- users.steps.ts
|   |   |-- board.steps.ts
|   |   |-- leads.steps.ts
|   |   `-- common.steps.ts
|   |
|   |-- hooks/
|   |   |-- before.ts
|   |   |-- after.ts
|   |   `-- world.ts
|   |
|   |-- utils/
|   |   |-- config.ts
|   |   |-- logger.ts
|   |   |-- testData.ts
|   |   `-- helpers.ts
|   |
|   `-- test-data/
|       |-- login.json
|       |-- branch.json
|       |-- users.json
|       |-- services.json
|       `-- leads.json
|
|-- reports/
|   |-- html/
|   |-- json/
|   `-- screenshots/
|
`-- README.md
```
