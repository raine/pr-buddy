import { FetchPullRequestsOk, LocalBranchesUpToDateMap } from './api'
import { PullRequest } from './github'

const data: {
  [repositoryPath: string]:
    | Pick<FetchPullRequestsOk, 'pullRequests' | 'localBranchesUpToDateMap'>
    | undefined
} = {}

export type PullRequestChange =
  | { type: 'PR_OUTDATED'; pullRequest: PullRequest }
  | {
      type: 'CHECK_FAILED'
      pullRequest: PullRequest
      failedCheckName: string
      failedCheckUrl: string | undefined
    }

function getGithubCheckRunChanges(
  prevPullRequest: PullRequest,
  pullRequest: PullRequest
): PullRequestChange[] {
  return pullRequest.commit.flattenedCheckRuns.reduce<PullRequestChange[]>(
    (acc, checkRun) => {
      const prevDataCheckRun = prevPullRequest?.commit.flattenedCheckRuns.find(
        (prevCheckRun) => prevCheckRun.id === checkRun.id
      )
      const checkRunWasPending = prevDataCheckRun?.status === 'IN_PROGRESS'
      const checkRunNowFailed =
        checkRun.status === 'COMPLETED' && checkRun.conclusion === 'FAILURE'

      return acc.concat(
        checkRunWasPending && checkRunNowFailed
          ? [
              {
                type: 'CHECK_FAILED' as const,
                pullRequest,
                failedCheckName: checkRun.name,
                failedCheckUrl: checkRun.detailsUrl
              }
            ]
          : []
      )
    },
    []
  )
}

function getGithubStatusContextChanges(
  prevPullRequest: PullRequest,
  pullRequest: PullRequest
): PullRequestChange[] {
  const commitStatusChecksFailed =
    prevPullRequest?.commit.status?.state === 'PENDING' &&
    pullRequest.commit.status?.state === 'FAILURE'

  const failedContext = pullRequest.commit.status?.contexts.find(
    ({ state }) => state === 'FAILURE'
  )

  return commitStatusChecksFailed && failedContext
    ? [
        {
          type: 'CHECK_FAILED' as const,
          pullRequest,
          failedCheckName: failedContext.context,
          failedCheckUrl: failedContext.targetUrl ?? undefined
        }
      ]
    : []
}

export function trackPullRequestChanges(
  repositoryPath: string,
  pullRequests: PullRequest[],
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
): PullRequestChange[] {
  const prevRepoData = data?.[repositoryPath]
  const changes = pullRequests.reduce<PullRequestChange[]>((acc, pr) => {
    const prevPrData = prevRepoData?.pullRequests.find(
      ({ url }) => url === pr.url
    )

    // Branch out of date
    const localBranchName = pr.headRefName
    const isBranchUpToDate = localBranchesUpToDateMap[pr.headRefName]
    const wasBranchUpToDate =
      prevRepoData?.localBranchesUpToDateMap?.[localBranchName] === true
    const hasBranchBecomeOutOfDate =
      wasBranchUpToDate && isBranchUpToDate === false

    // Legacy github status checks failed
    const statusContextChanges = prevPrData
      ? getGithubStatusContextChanges(prevPrData, pr)
      : []

    // New github check runs failed
    const checkRunChanges = prevPrData
      ? getGithubCheckRunChanges(prevPrData, pr)
      : []

    return acc.concat([
      ...(hasBranchBecomeOutOfDate
        ? [{ type: 'PR_OUTDATED' as const, pullRequest: pr }]
        : []),
      ...statusContextChanges,
      ...checkRunChanges
    ])
  }, [])

  data[repositoryPath] = {
    pullRequests,
    localBranchesUpToDateMap
  }

  return changes
}
