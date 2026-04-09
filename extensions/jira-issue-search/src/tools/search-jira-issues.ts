import { getPreferenceValues } from '@raycast/api';
import { Preferences } from '../hooks';
import { JiraSearchResult, resolveUserNamesInJql, resolveFieldIds } from '../jira-ai-utils';

const TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

type Input = {
  /**
   * A valid JQL (Jira Query Language) query. Must include an ORDER BY clause.
   * Use currentUser() to refer to the logged-in user.
   * For child issues use: issue in childIssuesOf("ISSUE-KEY")
   *
   * @example "assignee = currentUser() AND status != Done ORDER BY updated DESC"
   * @example "issuetype = Bug AND priority = High ORDER BY created DESC"
   * @example "issue in childIssuesOf(\"PROJ-123\") AND issuetype = Story ORDER BY created DESC"
   */
  jql: string;
  /**
   * Optional list of additional Jira field names to include in each result.
   * Use human-readable names (e.g. "labels", "sprint", "fix version", "components").
   * The tool discovers the correct field ID automatically.
   *
   * @example ["labels", "sprint"]
   * @example ["fix version", "components", "epic link"]
   */
  additionalFields?: string[];
};

export default async function searchJiraIssues(
  input: Input
): Promise<{ executedJql: string; issues: JiraSearchResult[] }> {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');

  // Resolve user names in JQL and field IDs in parallel
  const [resolvedJql, { storyPointsField, extraFields }] = await Promise.all([
    resolveUserNamesInJql(input.jql, prefs),
    resolveFieldIds(prefs, input.additionalFields ?? []),
  ]);

  const baseFields = ['summary', 'issuetype', 'status', 'assignee', 'priority', 'parent'];
  if (storyPointsField) baseFields.push(storyPointsField);
  const extraFieldIds = Object.values(extraFields);
  const fields = [...baseFields, ...extraFieldIds].join(',');

  const response = await fetchWithTimeout(
    `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(resolvedJql)}&fields=${fields}&maxResults=25`,
    { headers: { Authorization: `Bearer ${prefs.jiraToken}`, Accept: 'application/json' } }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Jira search failed (${response.status}): ${body || response.statusText} — JQL: ${resolvedJql}`);
  }

  const data = (await response.json()) as {
    issues: Array<{ key: string; fields: Record<string, unknown> }>;
  };

  const hasExtraFields = extraFieldIds.length > 0;

  return {
    executedJql: resolvedJql,
    issues: data.issues.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary as string,
      issueType: (issue.fields.issuetype as { name: string } | undefined)?.name,
      status: (issue.fields.status as { name: string } | undefined)?.name,
      assignee: (issue.fields.assignee as { displayName: string } | null | undefined)?.displayName,
      priority: (issue.fields.priority as { name: string } | undefined)?.name,
      parent: (issue.fields.parent as { key: string } | undefined)?.key,
      storyPoints:
        storyPointsField != null
          ? ((issue.fields[storyPointsField] as number | string | undefined) ?? undefined)
          : undefined,
      url: `${baseUrl}/browse/${issue.key}`,
      additionalFields: hasExtraFields
        ? Object.fromEntries(Object.entries(extraFields).map(([name, id]) => [name, issue.fields[id]]))
        : undefined,
    })),
  };
}
