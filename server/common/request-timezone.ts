function isValidIanaTimeZone(value: string): boolean {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getRequestTimeZone(
  body: Record<string, unknown>,
  request?: Request
): string | undefined {
  const raw =
    body.timezone ??
    body.timeZone ??
    request?.headers.get("x-timezone") ??
    undefined;

  if (typeof raw !== "string") {
    return undefined;
  }

  const timeZone = raw.trim();
  if (!timeZone || !isValidIanaTimeZone(timeZone)) {
    return undefined;
  }

  return timeZone;
}
