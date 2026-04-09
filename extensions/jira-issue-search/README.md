# Jira Issue Search

A Raycast extension to search, view, and open Jira issues directly from your launcher — with AI-powered natural language querying.

## Features

- **Live Search**: Search by Issue Key (e.g., `PROJ-123`) or summary text with real-time results.
- **Recently Viewed**: Displays your recent Jira history automatically when the search bar is empty.
- **Filter by Issue Type**: Dropdown to narrow results by Story, Bug, Task, Epic, Feature, and more.
- **AI Query (Raycast Pro)**: Ask for issues in plain English — the AI generates JQL and executes it automatically. Display names are resolved to internal usernames behind the scenes.
- **Smart Open Issue**: Jump to any issue using typed arguments, highlighted text, or your clipboard.
- **Native UI**: Issue-type icons and a clean categorized list.
- **Quick Actions**: Copy key, URL, or Markdown link instantly.

## Configuration

### Global Settings

These apply to all commands.

| Setting            | Description                                                                                       |
| :----------------- | :------------------------------------------------------------------------------------------------ |
| **Jira Base URL**  | Root URL of your Jira instance (e.g., `https://your-domain.atlassian.net` or your internal host). |
| **Jira API Token** | Your Personal Access Token used as a Bearer token for authentication.                             |

### Open Issue — Command Settings

Configure how the command finds the issue ID. Access via `Cmd + Shift + ,` on the command.

| Option            | Behaviour                                           |
| :---------------- | :-------------------------------------------------- |
| **Argument**      | Type the ID directly in the Raycast input field.    |
| **Selected Text** | Highlight a Jira ID in any app and run the command. |
| **Clipboard**     | Copy an ID to your clipboard and run the command.   |

## Commands

### Search Issues

Browse and search your Jira issues. When the search bar is empty, your recently viewed issues are shown. Type to filter by summary or key.

| Action             | Shortcut          |
| :----------------- | :---------------- |
| Open in browser    | `Enter`           |
| Copy Jira URL      | `Cmd + Enter`     |
| Copy Issue Key     | `Cmd + C`         |
| Copy Markdown link | `Cmd + Shift + C` |

### Open Issue

A no-view command that immediately opens an issue in your browser using the configured input source (argument, selection, or clipboard).

## AI Features (Raycast Pro)

Use natural language to query Jira. The extension converts your request into JQL, resolves any mentioned names to their internal Jira usernames, and returns matching issues.

### Sample queries

| You type                             | Executed JQL                                                                                       |
| :----------------------------------- | :------------------------------------------------------------------------------------------------- |
| `open bugs assigned to me`           | `assignee = currentUser() AND issuetype = Bug AND status != Done ORDER BY created DESC`            |
| `high priority stories this week`    | `issuetype = Story AND priority = High AND created >= startOfWeek() ORDER BY created DESC`         |
| `in progress stories for John Smith` | `assignee = jsmith AND issuetype = Story AND statusCategory = "In Progress" ORDER BY updated DESC` |
| `child stories of PROJ-123`          | `issue in childIssuesOf("PROJ-123") AND issuetype = Story ORDER BY created DESC`                   |
| `unresolved epics`                   | `issuetype = Epic AND resolution = Unresolved ORDER BY created DESC`                               |

### Name resolution

When you refer to someone by name, the extension automatically looks up their internal Jira username and uses it in the query. The resolved query (with the actual username) is shown at the top of the results.

### Privacy

Only your natural language query is sent to the AI model. No Jira issue content, API tokens, or personal data are included in the AI request.

## Installation & Development

```bash
npm install
npm run dev
```

Then configure your Jira URL and API Token when prompted by Raycast.

## Security

Your Jira API Token is stored securely using Raycast's encrypted preference storage. It is only sent as a Bearer token in headers to your configured Jira instance. Make sure your instance uses HTTPS.

**Author**: julien_lemonde  
**License**: MIT
