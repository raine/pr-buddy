import React from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { LocalBranchesUpToDateMap } from '../main/api'
import { PullRequest } from '../main/github'
import useMessages from './hooks/useMessages'
import PullRequestBranchStatus from './PullRequestBranchStatus'
import PullRequestChecks from './PullRequestChecks'

export default function PullRequestListItem({
  title,
  number,
  commit,
  headRefName,
  baseRefName,
  localBranchesUpToDateMap,
  url,
  repositoryPath,
  mergeable
}: PullRequest & {
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
  repositoryPath: string
}) {
  const queryClient = useQueryClient()
  const isUpToDateWithBase = localBranchesUpToDateMap[headRefName]
  const rebaseMutation = useMutation(
    () =>
      window.electronAPI.rebaseBranchOnLatestBase(
        repositoryPath,
        headRefName,
        baseRefName
      ),
    {
      onSuccess: async (res) => {
        if (res.result === 'OK') {
          queryClient.setQueryData('pull-requests', res.pullRequests)
        }
      }
    }
  )

  useMessages((message) => {
    if (message.type === 'REFRESH_PULL_REQUESTS') rebaseMutation.reset()
  })

  return (
    <div className="mb-4 border-gray-150 border rounded-md p-3 space-y-2">
      <div className="text-md leading-snug text-gray-700 font-medium">
        <a target="_blank" href={url}>
          {title} <span className="font-normal text-gray-500">#{number}</span>
        </a>
      </div>
      <div className="flex space-x-4">
        <div className="flex-grow ">
          <PullRequestChecks commit={commit} />
          <PullRequestBranchStatus
            isUpToDateWithBase={isUpToDateWithBase}
            baseRefName={baseRefName}
            headRefName={headRefName}
            rebaseFailed={rebaseMutation.data?.result === 'FAILED_TO_REBASE'}
            mergeable={mergeable}
          />
        </div>
        <div className="flex flex-col flex-shrink-0 w-[9rem]">
          {!isUpToDateWithBase ? (
            <button
              onClick={() => rebaseMutation.mutate()}
              className="px-5 bg-gray-50 hover:bg-gray-100 pt-2 pb-3 transition active:shadow-inner rounded-md text-normal border shadow-sm text-gray-600 border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
              disabled={rebaseMutation.isLoading}
            >
              Rebase on latest master
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
