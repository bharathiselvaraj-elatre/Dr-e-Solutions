const stepFiles = [
  "tests/src/hooks/**/*.ts",
  "tests/src/step-definitions/**/*.ts"
];

const formatters = [
  "progress",
  "summary",
  "json:reports/cucumber-report.json"
];

function profile(paths, extra = {}) {
  return {
    require: stepFiles,
    requireModule: ["ts-node/register"],
    paths: Array.isArray(paths) ? paths : [paths],
    format: formatters,
    timeout: 60000,
    ...extra,
  };
}

module.exports = {
  default: profile("tests/features/**/*.feature", {
    tags: "not @frontdesk and not @manual",
  }),
  login: profile("tests/features/sanity/auth.sanity.feature"),
  sanity: profile("tests/features/sanity/**/*.feature"),
  smoke: profile("tests/features/smoke/**/*.feature", {
    tags: "not @manual",
  }),
  regression: profile("tests/features/regression/**/*.feature"),
  ownerAccess: profile("tests/features/smoke/owner.smoke.feature"),
  logout: profile("tests/features/sanity/auth.sanity.feature"),
  branch: profile("tests/features/regression/branch.feature"),
  user: profile("tests/features/regression/users.feature"),
  board: profile("tests/features/regression/board.feature"),
  services: profile("tests/features/regression/board.feature"),
  leads: profile("tests/features/regression/leads.feature"),
  flowPositive: profile("tests/features/flows/full-positive.flow.feature"),
  flowNegative: profile("tests/features/flows/full-negative.flow.feature"),
  frontdesk: profile("tests/features/smoke/frontdesk.smoke.feature"),
  dashboard: profile("tests/features/regression/dashboard.feature"),
};
