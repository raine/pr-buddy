import React from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { match, __ } from 'ts-pattern'
import { LocalBranchesUpToDateMap } from '../main/api'
import { PullRequest } from '../main/github'
import useMessages from './hooks/useMessages'
import PullRequestBranchStatus from './PullRequestBranchStatus'
import PullRequestChecks from './PullRequestChecks'

function MonospaceOutput({ text }: { text: string }) {
  return (
    <div className="font-mono text-sm text-gray-600 bg-gray-50 p-1 rounded mt-1">
      {text}
    </div>
  )
}

export default function PullRequestListItem({
  title,
  number,
  commit,
  headRefName,
  baseRefName,
  localBranchesUpToDateMap,
  url,
  repositoryPath
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
    <div className="mb-4 border-gray-150 border rounded-md p-3">
      <div className="flex">
        <div className="flex-grow">
          <div className="text-md leading-snug text-gray-800 font-medium">
            <a target="_blank" href={url}>
              {title}{' '}
              <span className="font-normal text-gray-600">#{number}</span>
            </a>
          </div>
          <PullRequestChecks commit={commit} />
          <PullRequestBranchStatus
            isUpToDateWithBase={isUpToDateWithBase}
            baseRefName={baseRefName}
            headRefName={headRefName}
            rebaseFailed={rebaseMutation.data?.result === 'FAILED_TO_REBASE'}
          />
          {match(rebaseMutation.data)
            .with(
              { result: 'FAILED_TO_REBASE', message: __.string },
              ({ message }) => <MonospaceOutput text={message} />
            )
            .otherwise(() => null)}
        </div>
        <div className="ml-5 flex flex-col flex-shrink-0 w-[9rem]">
          {!isUpToDateWithBase ? (
            <button
              onClick={() => rebaseMutation.mutate()}
              className="px-5 bg-gray-50 hover:bg-gray-100 py-2 transition active:shadow-inner font-medium rounded-md text-normal border shadow-sm text-gray-600 border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
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
