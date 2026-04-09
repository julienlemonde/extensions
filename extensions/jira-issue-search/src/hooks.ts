import { getPreferenceValues } from '@raycast/api';
import { useFetch } from '@raycast/utils';

export interface Preferences {
  jiraUrl: string;
  jiraToken: string;
}

export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    issuetype: {
      name: string;
      iconUrl: string;
    };
    // Optional rich fields
    status?: { name: string; statusCategory?: { key: string; colorName: string } };
    assignee?: { displayName: string } | null;
    priority?: { name: string };
    parent?: { key: string };
    labels?: string[];
    // Dynamic custom fields (e.g. story points — field ID varies per instance)
    [key: string]: unknown;
  };
}

interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}

export interface JiraUser {
  accountId?: string; // Jira Cloud
  name?: string; // Jira Server / Data Center
  displayName: string;
  emailAddress?: string;
}

const BASE_FIELDS = 'summary,issuetype';

export function useJiraSearch(jql: string, { execute = true, rich = false, storyPointsField = '' } = {}) {
  const prefs = getPreferenceValues<Preferences>();
  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');

  const richFields = ['summary', 'issuetype', 'status', 'assignee', 'priority', 'parent', 'labels'];
  if (storyPointsField) richFields.push(storyPointsField);
  const fields = rich ? richFields.join(',') : BASE_FIELDS;

  const { data, isLoading, error } = useFetch<JiraSearchResponse>(
    `${baseUrl}/rest/api/2/search?jql=${encodeURIComponent(jql)}&fields=${fields}&maxResults=50`,
    {
      headers: {
        Authorization: `Bearer ${prefs.jiraToken}`,
        Accept: 'application/json',
      },
      execute: execute && !!jql,
      keepPreviousData: true,
    }
  );

  return {
    issues: data?.issues ?? [],
    isLoading,
    error,
    baseUrl,
  };
}
