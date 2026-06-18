export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getNextAllowedDelayMs(attemptCount: number): number {
  if (attemptCount <= 1) return 60_000;
  if (attemptCount === 2) return 2 * 60_000;
  if (attemptCount === 3) return 5 * 60_000;
  if (attemptCount === 4) return 10 * 60_000;
  return 30 * 60_000;
}

export function getNextAllowedTime(attemptCount: number): Date {
  return new Date(Date.now() + getNextAllowedDelayMs(attemptCount));
}

export function getRemainingSeconds(dateValue: string | null): number {
  if (!dateValue) return 0;
  return Math.max(Math.ceil((new Date(dateValue).getTime() - Date.now()) / 1000), 0);
}
