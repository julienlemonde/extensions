import { List, ActionPanel, Action, Icon, Image } from '@raycast/api';
import { JiraIssue } from './hooks';

interface Props {
  issue: JiraIssue;
  baseUrl: string;
}

export function IssueListItem({ issue, baseUrl }: Props) {
  return (
    <List.Item
      title={issue.key}
      subtitle={issue.fields.summary}
      icon={
        issue.fields.issuetype.iconUrl
          ? { source: issue.fields.issuetype.iconUrl, mask: Image.Mask.RoundedRectangle }
          : Icon.List
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Jira" url={`${baseUrl}/browse/${issue.key}`} />
          <Action.CopyToClipboard title="Copy Issue Key" content={issue.key} />
          <Action.CopyToClipboard
            title="Copy Markdown Link"
            content={`[${issue.key}](${baseUrl}/browse/${issue.key})`}
            shortcut={{ modifiers: ['cmd', 'shift'], key: 'c' }}
          />
        </ActionPanel>
      }
    />
  );
}
