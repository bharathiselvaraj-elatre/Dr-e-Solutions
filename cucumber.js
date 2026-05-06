module.exports = {
  default: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/**/*.feature"],
    tags: "not @frontdesk and not @manual",
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  login: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/auth/login.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  ownerAccess: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/owner/owner-smoke.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  logout: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/auth/logout.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  branch: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/branch/**/*.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  user: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/users/**/*.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  board: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/board/board.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  services: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/board/board.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  leads: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/leads/leads.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  flowPositive: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/flows/full-positive-flow.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  flowNegative: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/flows/full-negative-flow.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  },
  frontdesk: {
    require: [
      "tests/src/hooks/**/*.ts",
      "tests/src/step-definitions/**/*.ts"
    ],
    requireModule: ["ts-node/register"],
    paths: ["tests/features/frontdesk/frontdesk-smoke.feature"],
    format: ["progress", "summary", "json:reports/cucumber-report.json"],
    timeout: 60000
  }
};
