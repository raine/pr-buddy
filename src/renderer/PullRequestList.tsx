import React from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useTitle } from 'react-use'
import useMessages from './hooks/useMessages'
import PullRequestListItem from './PullRequestListItem'

export default function PullRequestList() {
  const queryClient = useQueryClient()

  const { isLoading, data } = useQuery(
    'pull-requests',
    () => window.electronAPI.fetchPullRequests(),
    {
      refetchInterval: 60000,
      refetchIntervalInBackground: true
    }
  )

  useMessages((message) => {
    if (message.type === 'REFRESH_PULL_REQUESTS')
      void queryClient.invalidateQueries('pull-requests')
  })

  useTitle(
    'PR Buddy' +
      (data?.remoteRepoPath !== undefined ? ` - ${data?.remoteRepoPath}` : '')
  )

  if (isLoading) {
    return <div>Loading...</div>
  } else {
    return (
      <div>
        {data?.pullRequests.map((pr) => (
          <PullRequestListItem
            key={pr.url}
            localBranchesUpToDateMap={data.localBranchesUpToDateMap}
            {...pr}
          />
        ))}
      </div>
    )
  }
}
