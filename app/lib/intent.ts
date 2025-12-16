export function getIntent(text: string): string {
  const lowered = text.toLowerCase();

  if (lowered.includes("scholar")) return "scholarship";
  if (lowered.includes("enroll") || lowered.includes("transferee")) return "enrollment";
  if (lowered.includes("wifi") || lowered.includes("wireless")) return "wifi";
  if (lowered.includes("event")) return "events";
  if (lowered.includes("announcement")) return "announcements";
  if (lowered.includes("class") && lowered.includes("tomorrow")) return "class_schedule";
  if (
    lowered.includes("tagaytay") ||
    lowered.includes("cainta") ||
    lowered.includes("alabang")
  )
    return "campus_specific";

  return "general";
}
