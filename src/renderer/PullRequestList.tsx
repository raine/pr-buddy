import React from 'react'
import { useQuery } from 'react-query'
import { useTitle } from 'react-use'
import './App.global.css'
import PullRequestListItem from './PullRequestListItem'

export default function PullRequestList() {
  const { isLoading, data } = useQuery(
    'pull-requests',
    () => window.electronAPI.fetchPullRequests(),
    {
      refetchInterval: 60000,
      refetchIntervalInBackground: true
    }
  )

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
