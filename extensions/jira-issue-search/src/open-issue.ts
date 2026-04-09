import { open, LaunchProps, getPreferenceValues, getSelectedText, Clipboard, showToast, Toast } from '@raycast/api';
import { Preferences as GlobalPreferences } from './hooks';

interface Preferences extends GlobalPreferences {
  inputSource: 'argument' | 'selection' | 'clipboard';
}

export default async function main(props: LaunchProps<{ arguments: { id?: string } }>) {
  const prefs = getPreferenceValues<Preferences>();
  let issueId = props.arguments.id?.trim();

  // Logic to switch source based on settings
  if (!issueId) {
    if (prefs.inputSource === 'selection') {
      try {
        issueId = (await getSelectedText()).trim();
      } catch {
        await showToast({ style: Toast.Style.Failure, title: 'No text selected' });
        return;
      }
    } else if (prefs.inputSource === 'clipboard') {
      issueId = (await Clipboard.readText())?.trim();
    }
  }

  if (!issueId) {
    await showToast({
      style: Toast.Style.Failure,
      title: 'Issue ID not found',
      message: `Source: ${prefs.inputSource}`,
    });
    return;
  }

  const baseUrl = prefs.jiraUrl.replace(/\/$/, '');
  await open(`${baseUrl}/browse/${issueId}`);
}
