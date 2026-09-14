/** Replaces pliny's formatDate; same output, no dependency. */
export function formatDate(date: string, locale = "en-US"): string {
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
