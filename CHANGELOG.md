# Changelog

## 1.4.0 (Unreleased)

- Make loading screen draggable.
- Show a notification when a PR branch becomes out of of date with base branch.
- Show a notification when a status check in PR fails.
- Bugfix: Update PR status check durations properly.

## 1.3.0 (17.11.2021)

- New more detailed checks UI.
- Tooltips shown on hover on various UI elements to provide more information.

## 1.2.0 (08.11.2021)

- Bugfix: Handle GitHub commit status where a build is terminated.
- Sort GitHub checks/statuses by start/creation time.
- While rebasing, if possible, automatically fix conflicts in `yarn.lock` and
  `.pnp.cjs` by running yarn.

## 1.1.0 (01.11.2021)

- Bugfix: Pop stash, if any, after failed rebase.
- Show whether PR has conflicts or is mergeable.
  ([`MergeableState`](https://docs.github.com/en/graphql/reference/enums#mergeablestate))
- Like the new mergeable status, show "Up to date" and "Out of date" as new
  badge-style element.
- Use homebrew (and hopefully newer than the mac default) version of git, if
  available.

## 1.0.2 (28.10.2021)

- New custom title bar with separate loading indicator.
- UI polish.
- Update pull requests on window focus.

## 1.0.1 (26.10.2021)

- Use GitHub Enterprise specific URL in API key onboarding screen, if
  applicable.
- Rebase in locally checked out version of the branch, as opposed to in detached
  HEAD.
- When quitting, save the last opened repo to be opened in next start.

## 1.0.0 (25.10.2021)

- Initial release
