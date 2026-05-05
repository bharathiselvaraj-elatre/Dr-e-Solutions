const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { sendFailureReport } = require('./sendReport');

const reportsDir = path.join(__dirname, 'reports');
const combinedReportPath = path.join(reportsDir, 'cucumber-report.json');
const signupReportPath = path.join(reportsDir, 'cucumber-signup-positive.json');
const loginReportPath = path.join(reportsDir, 'cucumber-login-positive.json');
const postPositiveReportPath = path.join(reportsDir, 'cucumber-post-positive.json');
const positiveReportPath = path.join(reportsDir, 'cucumber-positive.json');
const negativeReportPath = path.join(reportsDir, 'cucumber-negative.json');
const summaryPath = path.join(reportsDir, 'run-summary.json');
const authPath = path.join(__dirname, 'auth.json');

function ensureReportsDir() {
  fs.mkdirSync(reportsDir, { recursive: true });
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function summarizeReport(features) {
  let scenarios = 0;
  let passed = 0;
  let failed = 0;
  const failedScenarios = [];

  for (const feature of features) {
    for (const scenario of feature.elements ?? []) {
      scenarios += 1;
      const failedStep = (scenario.steps ?? []).find((step) => step.result?.status === 'failed');

      if (failedStep) {
        failed += 1;
        failedScenarios.push({
          feature: feature.name ?? 'Unknown feature',
          scenario: scenario.name ?? 'Unknown scenario',
          step: failedStep.name ?? 'Unknown step',
        });
      } else {
        passed += 1;
      }
    }
  }

  return { scenarios, passed, failed, failedScenarios };
}

function archiveLatestReport(targetPath) {
  if (!fs.existsSync(combinedReportPath)) {
    throw new Error(`Expected report at ${combinedReportPath}, but none was generated.`);
  }

  fs.copyFileSync(combinedReportPath, targetPath);
  return readJson(targetPath);
}

function clearLatestReport() {
  if (fs.existsSync(combinedReportPath)) {
    fs.unlinkSync(combinedReportPath);
  }
}

function removeAuthState() {
  if (fs.existsSync(authPath)) {
    fs.unlinkSync(authPath);
  }
}

function runTaggedSuite(label, scriptName, archivedPath) {
  console.log(`\n=== Running ${label} suite (${scriptName}) ===`);
  clearLatestReport();

  const result = spawnSync(`npm run ${scriptName}`, {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  const features = archiveLatestReport(archivedPath);
  const summary = summarizeReport(features);

  console.log(`${label} summary: ${summary.passed}/${summary.scenarios} passed, ${summary.failed} failed`);

  return {
    label,
    scriptName,
    exitCode: summary.failed > 0 || result.error ? 1 : 0,
    reportPath: archivedPath,
    features,
    summary,
  };
}

async function main() {
  ensureReportsDir();
  removeAuthState();

  const signupRun = runTaggedSuite('signup-positive', 'test:positive:signup', signupReportPath);
  removeAuthState();
  const loginRun = runTaggedSuite('login-positive', 'test:positive:login', loginReportPath);
  const postPositiveRun = runTaggedSuite('post-positive', 'test:positive:post', postPositiveReportPath);
  const negativeRun = runTaggedSuite('negative', 'test:negative', negativeReportPath);

  const positiveFeatures = [...signupRun.features, ...loginRun.features, ...postPositiveRun.features];
  const positiveSummary = summarizeReport(positiveFeatures);
  fs.writeFileSync(positiveReportPath, JSON.stringify(positiveFeatures, null, 2));

  const combinedFeatures = [...positiveFeatures, ...negativeRun.features];
  fs.writeFileSync(combinedReportPath, JSON.stringify(combinedFeatures, null, 2));

  const summary = {
    generatedAt: new Date().toISOString(),
    order: ['signup-positive', 'login-positive', 'post-positive', 'negative'],
    positive: positiveSummary,
    negative: negativeRun.summary,
    phases: {
      signupPositive: signupRun.summary,
      loginPositive: loginRun.summary,
      postPositive: postPositiveRun.summary,
      negative: negativeRun.summary,
    },
    overallFailed: positiveSummary.failed + negativeRun.summary.failed,
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  await sendFailureReport({
    reportPath: combinedReportPath,
    summaryPath,
  });

  if (positiveSummary.failed > 0 || negativeRun.summary.failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Ordered suite runner failed:', error);
  process.exit(1);
});
