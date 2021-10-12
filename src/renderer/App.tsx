import React from 'react'
import './App.global.css'
import { useQuery, QueryClient, QueryClientProvider } from 'react-query'
import { PullRequest, StatusState } from '../main/github'
import classNames from 'classnames'
import { LocalBranchesUpToDateMap } from '../main/api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

function StatusCheckBox({ state }: { state: StatusState }) {
  const color = ((): string => {
    switch (state) {
      case 'SUCCESS':
        return 'bg-status-green'
      case 'FAILURE':
        return 'bg-status-red'
      default:
        return 'bg-status-yellow'
    }
  })()

  return (
    <div
      className={classNames(
        'w-[12px] h-[12px] rounded-full mr-1 last:mr-0',
        color
      )}
    ></div>
  )
}

type PullRequestBranchStatusProps = {
  isUpToDateWithBase: boolean
  baseRefName: string
}
function PullRequestBranchStatus({
  isUpToDateWithBase,
  baseRefName
}: PullRequestBranchStatusProps) {
  return (
    <div className="text-gray-600 mt-1">
      <span className="font-semibold">Status: </span>
      {isUpToDateWithBase ? (
        <span>
          Remote branch is <span className="text-green-700">up-to-date</span>{' '}
          with {baseRefName}
        </span>
      ) : (
        <span>
          Remote branch is <span className="text-red-800">out-of-date</span>{' '}
          with {baseRefName}
        </span>
      )}
    </div>
  )
}

function PullRequestListItem({
  title,
  number,
  commit,
  headRefName,
  baseRefName,
  localBranchesUpToDateMap
}: PullRequest & { localBranchesUpToDateMap: LocalBranchesUpToDateMap }) {
  const isUpToDateWithBase = localBranchesUpToDateMap[headRefName]

  return (
    <div className="mb-4 border-gray-100 border rounded-md p-3">
      <div className="flex">
        <div className="flex-grow">
          <div className="text-md leading-snug text-gray-800 font-medium">
            {title} <span className="font-normal text-gray-600">#{number}</span>
          </div>
          <div className="flex mt-1">
            {commit.status !== null ? (
              <div className="ml-2 inline-flex items-center">
                {commit.status.contexts.map(({ state, context }) => (
                  <StatusCheckBox key={context} state={state} />
                ))}
              </div>
            ) : null}
          </div>
          <PullRequestBranchStatus
            isUpToDateWithBase={isUpToDateWithBase}
            baseRefName={baseRefName}
          />
        </div>
        <div className="ml-5 flex flex-col w-[9rem]">
          {!isUpToDateWithBase ? (
            <button className="px-5 py-2 rounded-md font-medium border transition text-indigo-500 border-indigo-300 bg-white hover:text-white hover:border-indigo-400 hover:bg-indigo-400 active:border-indigo-700 active:bg-indigo-700 focus:ring-green-300">
              Rebase on latest master
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PullRequestList() {
  const query = useQuery('pull-requests', () =>
    window.electronAPI.fetchPullRequests()
  )

  console.log(query.data)

  if (query.isLoading) {
    return <div>Loading...</div>
  } else {
    return (
      <div>
        {query.data?.pullRequests.map((pr) => (
          <PullRequestListItem
            key={pr.url}
            localBranchesUpToDateMap={query.data.localBranchesUpToDateMap}
            {...pr}
          />
        ))}
      </div>
    )
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-5">
        <PullRequestList />
      </div>
    </QueryClientProvider>
  )
}
