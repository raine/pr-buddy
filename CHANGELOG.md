# Changelog

## 1.1.1 (Unreleased)

- Bugfix: Handle GitHub commit status where a build is terminated.

## 1.1.0

- Bugfix: Pop stash, if any, after failed rebase.
- Show whether PR has conflicts or is mergeable.
  ([`MergeableState`](https://docs.github.com/en/graphql/reference/enums#mergeablestate))
- Like the new mergeable status, show "Up to date" and "Out of date" as new
  badge-style element.
- Use homebrew (and hopefully newer than the mac default) version of git, if
  available.

## 1.0.2

- New custom title bar with separate loading indicator.
- UI polish.
- Update pull requests on window focus.

## 1.0.1

- Use GitHub Enterprise specific URL in API key onboarding screen, if
  applicable.
- Rebase in locally checked out version of the branch, as opposed to in detached
  HEAD.
- When quitting, save the last opened repo to be opened in next start.

## 1.0.0

- Initial release
