export function normalizeContributorName(rawName?: string): string {
  const nameAsString = String(rawName || '');

  const withoutEmailDomain = nameAsString.replace(/@.*$/, '');
  const onlyAlphanumericAndSeparators = withoutEmailDomain.replaceAll(/[^a-zA-Z0-9\s._-]/g, '');
  const collapsedWhitespace = onlyAlphanumericAndSeparators.replaceAll(/\s+/g, ' ');
  const trimmedName = collapsedWhitespace.trim();

  return trimmedName.toLowerCase();
}
