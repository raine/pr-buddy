import { select, match } from 'ts-pattern'
import { BrowserWindow, Notification as ElectronNotification } from 'electron'
import { PullRequestChange } from './track-pull-request-changes'

type Notification = Pick<ElectronNotification, 'title' | 'body'>

export function prChangeToNotification(
  change: PullRequestChange
): Notification {
  return match(change)
    .with({ type: 'PR_OUTDATED', pullRequest: select() }, (pr) => ({
      title: `Pull request out of date with ${pr.baseRefName}`,
      body: `${pr.title} #${pr.number}`
    }))
    .run()
}

export function showNotification(
  window: BrowserWindow,
  notification: Notification
) {
  new ElectronNotification({ ...notification, silent: true })
    .on('click', () => {
      window.show()
    })
    .show()
}
