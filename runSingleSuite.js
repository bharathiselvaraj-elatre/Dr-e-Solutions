const { spawnSync } = require('child_process');
const { sendFailureReport } = require('./sendReport');

function resolveExitCode(result) {
  if (typeof result.status === 'number') {
    return result.status;
  }

  if (result.error) {
    return 1;
  }

  return 0;
}

async function main() {
  const profile = process.argv[2];

  if (!profile) {
    console.error('Usage: node runSingleSuite.js <cucumber-profile>');
    process.exit(1);
  }

  const result = spawnSync('npx cucumber-js -p ' + profile + ' -c cucumber.js', {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  const exitCode = resolveExitCode(result);

  try {
    await sendFailureReport({
      reportPath: 'reports/cucumber-report.json',
      summaryPath: 'reports/run-summary.json',
    });
  } catch (error) {
    console.error('Failed while sending report:', error);
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Single suite runner failed:', error);
  process.exit(1);
});
