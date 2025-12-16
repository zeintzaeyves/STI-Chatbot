export function isResolved(intent: string, response: string): boolean {
  if (!response || response.trim().length < 15) return false;

  const alwaysUnresolved: string[] = [
    "class_schedule",
    "announcements",
    "campus_specific",
  ];

  if (alwaysUnresolved.includes(intent)) return false;

  return true;
}
