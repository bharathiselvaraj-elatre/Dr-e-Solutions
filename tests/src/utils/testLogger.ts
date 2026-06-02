import { CustomWorld } from '../hooks/world';

function formatValue(value: unknown): string {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

export async function logRegressionStep(
  world: CustomWorld,
  entity: string,
  action: string,
  details?: Record<string, unknown>
) {
  const message = `[${entity}] ${action}`;
  const detailLines = details
    ? Object.entries(details).map(([key, value]) => `- ${key}: ${formatValue(value)}`)
    : [];
  const output = [message, ...detailLines].join('\n');

  console.log(output);
  await world.attach(output, 'text/plain');
}
