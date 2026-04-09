import { List, getPreferenceValues, getSelectedText, Clipboard } from '@raycast/api';
import { useFetch } from '@raycast/utils';
import { useState, useEffect } from 'react';
import { useJiraSearch, Preferences } from './hooks';
import { IssueListItem } from './IssueListItem';

const ISSUE_TYPES = ['Story', 'Bug', 'Task', 'Epic', 'Feature', 'Sub-task', 'Improvement', 'New Feature'];

interface CommandPreferences {
  useSelectionSearch: boolean;
}

interface PickerIssue {
  key: string;
  summaryText: string;
  img?: string;
}

interface PickerResponse {
  sections: Array<{
    id: string;
    issues: PickerIssue[];
  }>;
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences & CommandPreferences>();
  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');

  const [searchText, setSearchText] = useState('');
  const [issueType, setIssueType] = useState('all');

  useEffect(() => {
    if (!prefs.useSelectionSearch) return;
    Promise.all([getSelectedText().catch(() => ''), Clipboard.readText().catch(() => '')]).then(
      ([selected, clipboard]) => {
        const trimmed = selected.trim();
        // Skip if the "selected" text is identical to the clipboard — it's not a real selection
        if (trimmed && trimmed !== clipboard?.trim()) {
          setSearchText(trimmed);
        }
      }
    );
  }, []);

  const trimmed = searchText.trim().toUpperCase();
  const isKeySearch = !!searchText && /^[A-Z]+-\d+$/.test(trimmed);
  const hasEnoughText = searchText.trim().length >= 3;
  const typeClause = issueType !== 'all' ? ` AND issuetype = "${issueType}"` : '';

  // Issue picker — always fetched, only used when search is empty
  const { data: pickerData, isLoading: pickerLoading } = useFetch<PickerResponse>(
    `${baseUrl}/rest/api/2/issue/picker?query=&currentJQL=&showSubTasks=true`,
    {
      headers: { Authorization: `Bearer ${prefs.jiraToken}`, Accept: 'application/json' },
      execute: !searchText,
      keepPreviousData: true,
    }
  );

  // Map picker history results to JiraIssue shape
  const pickerIssues = (pickerData?.sections.find((s) => s.id === 'hs')?.issues ?? []).map((item) => ({
    key: item.key,
    fields: {
      summary: item.summaryText,
      issuetype: { name: '', iconUrl: item.img ? `${baseUrl}${item.img}` : '' },
    },
  }));

  // JQL search — only when there is search text
  const jqlPart = isKeySearch
    ? `(key = ${trimmed} OR text ~ "${trimmed}")`
    : hasEnoughText
      ? searchText
          .trim()
          .split(/\s+/)
          .map((word) => `text ~ "${word.replace(/"/g, '\\"')}"`)
          .join(' AND ')
      : null;

  const jql = jqlPart ? `${jqlPart}${typeClause} ORDER BY updated DESC` : '';

  const {
    issues: rawIssues,
    isLoading: searchLoading,
    error,
    baseUrl: searchBaseUrl,
  } = useJiraSearch(jql, {
    execute: !!jqlPart,
  });

  const searchIssues = isKeySearch
    ? [...rawIssues].sort((a, b) => (a.key === trimmed ? -1 : b.key === trimmed ? 1 : 0))
    : rawIssues;

  const issues = searchText ? searchIssues : pickerIssues;
  const isLoading = searchText ? searchLoading : pickerLoading;
  const resolvedBaseUrl = searchBaseUrl || baseUrl;

  if (error && !error.message?.includes('Bad Request')) {
    throw error;
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by key (PROJ-123) or keyword..."
      filtering={false}
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Issue Type" onChange={setIssueType}>
          <List.Dropdown.Item title="All Types" value="all" />
          {ISSUE_TYPES.map((type) => (
            <List.Dropdown.Item key={type} title={type} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={searchText ? 'Search Results' : 'Recently Viewed'}>
        {issues.map((issue) => (
          <IssueListItem key={issue.key} issue={issue} baseUrl={resolvedBaseUrl} />
        ))}
      </List.Section>
    </List>
  );
}
