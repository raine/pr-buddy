import React from 'react'
import { useMutation, useQueryClient } from 'react-query'
import { match, not, __ } from 'ts-pattern'
import { LocalBranchesUpToDateMap } from '../main/api'
import { PullRequest } from '../main/github'
import './App.global.css'
import PullRequestBranchStatus from './PullRequestBranchStatus'
import { CheckRunStateCircle, StatusContextStateCircle } from './StateCircle'

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
  url
}: PullRequest & { localBranchesUpToDateMap: LocalBranchesUpToDateMap }) {
  const queryClient = useQueryClient()
  const isUpToDateWithBase = localBranchesUpToDateMap[headRefName]
  const rebaseMutation = useMutation(
    () => window.electronAPI.rebaseBranchOnLatestBase(headRefName, baseRefName),
    {
      onSuccess: async ({ result }) => {
        // Triggering pull requests to load again would clear the error message
        if (result === 'OK')
          await queryClient.invalidateQueries('pull-requests')
      }
    }
  )

  return (
    <div className="mb-4 border-gray-100 border rounded-md p-3">
      <div className="flex">
        <div className="flex-grow">
          <div className="text-md leading-snug text-gray-800 font-medium">
            <a target="_blank" href={url}>
              {title}{' '}
              <span className="font-normal text-gray-600">#{number}</span>
            </a>
          </div>
          <div className="flex my-2">
            {commit.status !== null || commit.flattenedCheckRuns?.length ? (
              <div className="inline-flex items-center">
                <span className="text-gray-600 font-semibold mr-2">
                  Checks:
                </span>{' '}
                {match(commit)
                  .with({ status: not(__.nullish) }, (commit) =>
                    commit.status.contexts.map((context) => (
                      <StatusContextStateCircle key={context.id} {...context} />
                    ))
                  )
                  .with({ flattenedCheckRuns: __ }, (commit) =>
                    commit.flattenedCheckRuns.map((checkRun) => (
                      <CheckRunStateCircle key={checkRun.id} {...checkRun} />
                    ))
                  )
                  .otherwise(() => null)}
              </div>
            ) : null}
          </div>
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
