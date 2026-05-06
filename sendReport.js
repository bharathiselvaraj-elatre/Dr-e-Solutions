const fs = require('fs');
const nodemailer = require('nodemailer');

const defaultReportPath = 'reports/cucumber-report.json';
const defaultSummaryPath = 'reports/run-summary.json';
const sender = 'bharathiselvaraj.elatre@gmail.com';
const receiver = 'bharathiselvaraj@elatre.com';
const appPassword = 'pbgi txgt kbtz sbsv'.replace(/\s+/g, '');
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL ?? '';
const slackChannel = process.env.SLACK_CHANNEL ?? 'dr.e-automation';

function loadJsonIfPresent(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`Could not parse JSON report at ${filePath}: ${error.message}`);
    return fallback;
  }
}

function collectFailures(report) {
  const failedScenarios = [];

  for (const feature of report) {
    for (const scenario of feature.elements ?? []) {
      const failedStep = (scenario.steps ?? []).find((step) => step.result?.status === 'failed');
      if (failedStep) {
        failedScenarios.push({
          feature: feature.name ?? 'Unknown feature',
          scenario: scenario.name ?? 'Unknown scenario',
          step: failedStep.name ?? 'Unknown step',
        });
      }
    }
  }

  return failedScenarios;
}

async function sendSlackFailureReport({ summary, failedScenarios, reportPath }) {
  if (!slackWebhookUrl) {
    console.log('Slack webhook not configured. Skipping Slack notification.');
    return;
  }

  const summaryLines = summary
    ? [
        `Run order: ${summary.order.join(' -> ')}`,
        `Positive suite: ${summary.positive.passed}/${summary.positive.scenarios} passed, ${summary.positive.failed} failed`,
        `Negative suite: ${summary.negative.passed}/${summary.negative.scenarios} passed, ${summary.negative.failed} failed`,
      ]
    : [];

  const failureLines = failedScenarios
    .slice(0, 10)
    .map((failure, index) => `${index + 1}. ${failure.feature} -> ${failure.scenario} -> ${failure.step}`);

  const payload = {
    channel: slackChannel,
    text: 'dr.e automation failure alert',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'dr.e automation failed',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '*Status:* Failed',
            ...summaryLines.map((line) => line.replace(/^([^:]+):/, '*$1:*')),
            `*Report:* \`${reportPath}\``,
          ].join('\n'),
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Failed scenarios:*\n${failureLines.join('\n')}`,
        },
      },
    ],
  };

  const response = await fetch(slackWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack notification failed: ${response.status} ${body}`);
  }

  console.log('Slack notification sent.');
}

async function sendFailureReport({
  reportPath = defaultReportPath,
  summaryPath = defaultSummaryPath,
} = {}) {
  if (!fs.existsSync(reportPath)) {
    console.log('Report not found');
    return;
  }

  const report = loadJsonIfPresent(reportPath, []);
  const summary = loadJsonIfPresent(summaryPath, null);
  const failedScenarios = collectFailures(report);

  if (!failedScenarios.length) {
    console.log('All scenarios passed. No email sent.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: sender,
      pass: appPassword,
    },
  });

  const summaryLines = summary
    ? [
        `Run order: ${summary.order.join(' -> ')}`,
        `Positive suite: ${summary.positive.passed}/${summary.positive.scenarios} passed, ${summary.positive.failed} failed`,
        `Negative suite: ${summary.negative.passed}/${summary.negative.scenarios} passed, ${summary.negative.failed} failed`,
      ]
    : [];

  const failureLines = failedScenarios
    .slice(0, 15)
    .map((failure, index) => `${index + 1}. ${failure.feature} -> ${failure.scenario} -> ${failure.step}`);

  const text = [
    'Automation execution completed with failures.',
    ...summaryLines,
    '',
    'Failed scenarios:',
    ...failureLines,
    '',
    `Detailed report: ${reportPath}`,
  ].join('\n');

  try {
    const info = await transporter.sendMail({
      from: sender,
      to: receiver,
      subject: 'Alert : Automation Test Failed',
      text,
    });

    console.log('Email sent:', info.response);
  } catch (error) {
    console.log('Error sending email:', error);
  }

  try {
    await sendSlackFailureReport({ summary, failedScenarios, reportPath });
  } catch (error) {
    console.log('Error sending Slack notification:', error);
  }
}

module.exports = { sendFailureReport };

if (require.main === module) {
  sendFailureReport().catch((error) => {
    console.error('Report sender failed:', error);
    process.exit(1);
  });
}
