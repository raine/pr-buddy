import React from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useTitle } from 'react-use'
import { useHistory } from 'react-router-dom'
import useMessages from './hooks/useMessages'
import PullRequestListItem from './PullRequestListItem'

type PullRequestListProps = {
  repositoryPath: string
}

export default function PullRequestList({
  repositoryPath
}: PullRequestListProps) {
  const queryClient = useQueryClient()
  const history = useHistory()

  const { isLoading, data, error, isFetched } = useQuery(
    'pull-requests',
    () =>
      window.electronAPI.fetchPullRequests(repositoryPath).catch((err) => {
        // Quick and dirty expected errors
        // Throwing strings because error objects are not useful here
        // https://github.com/electron/electron/issues/24427
        if (err.message.includes('HttpError: Bad credentials')) {
          throw 'GITHUB_BAD_CREDENTIALS'
        } else if (err.message.includes('HttpError')) {
          throw 'GENERIC_HTTP_ERROR'
        } else {
          throw err
        }
      }),
    {
      refetchInterval: 60000,
      refetchIntervalInBackground: true,
      retry: false,
      onSuccess: ({ result, remoteRepoPath }) => {
        if (result === 'NO_TOKEN_IN_GIT_CONFIG') {
          history.push('/set-api-token', {
            remoteRepoPath: remoteRepoPath
          })
        }
      }
    }
  )

  useTitle(
    'PR Buddy' +
      (data?.result === 'OK' && data.remoteRepoPath !== undefined
        ? ` - ${data.remoteRepoPath}`
        : '')
  )

  useMessages((message) => {
    if (message.type === 'REFRESH_PULL_REQUESTS')
      void queryClient.invalidateQueries('pull-requests')
  })

  if (!isFetched && isLoading) {
    return (
      <div className="flex items-center justify-center h-[85vh]">
        <div className="text-3xl text-gray-400">Loading...</div>
      </div>
    )
  } else {
    return (
      <div className="p-5">
        {error === 'GENERIC_HTTP_ERROR' && (
          <div className="text-sm bg-red-500 text-gray-100 rounded px-4 py-2 mb-2 text-shadow-sm">
            ERROR: Could not fetch pull requests from GitHub
          </div>
        )}
        {data?.result === 'OK' &&
          !!data.pullRequests.length &&
          data.pullRequests.map((pr) => (
            <PullRequestListItem
              key={pr.url}
              repositoryPath={repositoryPath}
              localBranchesUpToDateMap={data.localBranchesUpToDateMap}
              {...pr}
            />
          ))}
        {data?.result === 'OK' && !data.pullRequests.length && (
          <div className="flex items-center justify-center h-[85vh] flex-col">
            <div className="text-2xl text-gray-600 font-normal">
              You have no open pull requests in{' '}
              <span className="font-medium">{data.remoteRepoPath}</span>
            </div>
            <div className="text-gray-400 mt-6 text-sm">
              Tip: Hit{' '}
              <div className="inline-block border px-[2px] border-gray-200 rounded">
                Command-R
              </div>{' '}
              to reload
            </div>
          </div>
        )}
      </div>
    )
  }
}
