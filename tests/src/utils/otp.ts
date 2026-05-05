function pad(value: number) {
  return value.toString().padStart(2, '0');
}

export function generateOTP(date = new Date()): string {
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = pad(date.getFullYear() % 100);

  return `${day}${month}${year}`;
}
