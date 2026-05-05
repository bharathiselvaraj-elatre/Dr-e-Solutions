import fs from 'fs';
import path from 'path';

export type RuntimeCredentials = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organization: string;
  mobile: string;
};

const runtimeCredentialsPath = path.resolve(process.cwd(), 'reports', 'runtime-credentials.json');

function ensureReportDirectory() {
  fs.mkdirSync(path.dirname(runtimeCredentialsPath), { recursive: true });
}

export function saveRuntimeCredentials(credentials: RuntimeCredentials) {
  ensureReportDirectory();
  fs.writeFileSync(runtimeCredentialsPath, JSON.stringify(credentials, null, 2), 'utf8');
}

export function loadRuntimeCredentials(): RuntimeCredentials {
  if (!fs.existsSync(runtimeCredentialsPath)) {
    throw new Error(`Runtime credentials file not found at ${runtimeCredentialsPath}. Run signup first.`);
  }

  return JSON.parse(fs.readFileSync(runtimeCredentialsPath, 'utf8')) as RuntimeCredentials;
}

export function clearRuntimeCredentials() {
  if (fs.existsSync(runtimeCredentialsPath)) {
    fs.unlinkSync(runtimeCredentialsPath);
  }
}

export function getRuntimeCredentialsPath() {
  return runtimeCredentialsPath;
}
