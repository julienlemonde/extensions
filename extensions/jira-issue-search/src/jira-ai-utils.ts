import { JiraUser, Preferences } from './hooks';

// Common story points field name variations across Jira Cloud, Server, and Data Center instances
const STORY_POINT_FIELD_NAMES = [
  'story points',
  'story point estimate',
  'story point',
  'story_points',
  'points',
  'sp',
  'estimate',
];

/**
 * Fetches all Jira fields once and resolves:
 * - The story points custom field ID for this instance
 * - Any additional human-readable field names (e.g. "labels", "sprint") to their field IDs
 *
 * Falls back to using the name as-is for built-in fields (e.g. "labels" is already its own ID).
 */
export async function resolveFieldIds(
  prefs: Preferences,
  additionalFieldNames: string[] = []
): Promise<{ storyPointsField: string | null; extraFields: Record<string, string> }> {
  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');
  try {
    const response = await fetch(`${baseUrl}/rest/api/2/field`, {
      headers: { Authorization: `Bearer ${prefs.jiraToken}`, Accept: 'application/json' },
    });
    if (!response.ok) return { storyPointsField: null, extraFields: {} };
    const fields = (await response.json()) as Array<{ id: string; name: string }>;

    const storyPointsField = fields.find((f) => STORY_POINT_FIELD_NAMES.includes(f.name.toLowerCase()))?.id ?? null;

    const extraFields: Record<string, string> = {};
    for (const name of additionalFieldNames) {
      const normalized = name.toLowerCase();
      const match = fields.find((f) => f.name.toLowerCase() === normalized || f.id.toLowerCase() === normalized);
      // Fall back to the name itself — works for built-in fields like "labels", "components"
      extraFields[name] = match?.id ?? name;
    }

    return { storyPointsField, extraFields };
  } catch {
    return { storyPointsField: null, extraFields: {} };
  }
}

/**
 * Normalizes a name for fuzzy comparison: strips accents, lowercases, removes commas,
 * and sorts words alphabetically. This makes "Pasquier, Lea" match "Lea Pasquier".
 */
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/,/g, '').split(/\s+/).sort().join(' ');
}

/**
 * Detects `assignee = "Display Name"` and `reporter = "Display Name"` patterns in a JQL string,
 * looks up each name in Jira's user API, and replaces them with the proper account identifier.
 * Uses accent-normalized comparison so names like "Hébert" match "Hebert" in the API response.
 * Falls back to the original string if lookup fails or the user isn't found.
 */
export async function resolveUserNamesInJql(jql: string, prefs: Preferences): Promise<string> {
  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');

  // Match: assignee = "Some Name" or reporter = "Some Name"
  const pattern = /\b(assignee|reporter)\s*=\s*"([^"]+)"/gi;
  const matches = [...jql.matchAll(pattern)];
  if (matches.length === 0) return jql;

  let resolved = jql;

  for (const match of matches) {
    const [fullMatch, field, displayName] = match;
    // Skip if it looks like a JQL function (e.g. currentUser())
    if (displayName.includes('(')) continue;

    try {
      const normalizedDisplayName = normalizeName(displayName);

      // Both params sent for compatibility: Jira Cloud uses `query`, Server/Data Center uses `username`
      let users = await fetchUsers(baseUrl, prefs.jiraToken, displayName);

      // If no results with the accented name, retry with the accent-stripped version
      if (users.length === 0) {
        const accentStripped = displayName.normalize('NFD').replace(/\p{M}/gu, '');
        if (accentStripped !== displayName) {
          users = await fetchUsers(baseUrl, prefs.jiraToken, accentStripped);
        }
      }

      if (users.length === 0) continue;

      // Prefer exact accent-normalized match; fall back to first result
      const user = users.find((u) => normalizeName(u.displayName) === normalizedDisplayName) ?? users[0];
      if (!user) continue;

      const identifier = user.name;
      if (!identifier) continue;

      resolved = resolved.replace(fullMatch, `${field} = ${identifier}`);
    } catch {
      // Keep original if lookup fails
    }
  }

  return resolved;
}

async function fetchUsers(baseUrl: string, token: string, query: string): Promise<JiraUser[]> {
  const response = await fetch(
    `${baseUrl}/rest/api/2/user/search?query=${encodeURIComponent(query)}&username=${encodeURIComponent(query)}&maxResults=5`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  );
  if (!response.ok) return [];
  return (await response.json()) as JiraUser[];
}

export type JiraSearchResult = {
  key: string;
  summary: string;
  issueType: string | undefined;
  status: string | undefined;
  assignee: string | undefined;
  priority: string | undefined;
  parent: string | undefined;
  storyPoints: number | string | undefined;
  url: string;
  /** Dynamically requested fields, keyed by the name the user asked for. */
  additionalFields?: Record<string, unknown>;
};
