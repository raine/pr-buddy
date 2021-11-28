import { LocalBranchesUpToDateMap } from './api'
import { PullRequest } from './github'

const pullRequestUpToDateMap = new Map<string, boolean>()

export type PullRequestChange = {
  type: 'PR_OUTDATED'
  pullRequest: PullRequest
}

export function trackPullRequestChanges(
  pullRequests: PullRequest[],
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
): PullRequestChange[] {
  const changes = pullRequests.reduce<PullRequestChange[]>(
    (acc, pr) =>
      pullRequestUpToDateMap.get(pr.url) === true &&
      localBranchesUpToDateMap[pr.headRefName] === false
        ? [...acc, { type: 'PR_OUTDATED', pullRequest: pr }]
        : acc,
    []
  )

  pullRequests.forEach((pr) => {
    pullRequestUpToDateMap.set(pr.url, localBranchesUpToDateMap[pr.headRefName])
  })

  return changes
}
