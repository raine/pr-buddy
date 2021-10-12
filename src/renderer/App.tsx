import React from 'react'
import './App.global.css'
import { useQuery, QueryClient, QueryClientProvider } from 'react-query'
import { PullRequest, StatusState } from '../github'
import classNames from 'classnames'

const queryClient = new QueryClient()

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

function PullRequestListItem({ title, number, commit }: PullRequest) {
  return (
    <div className="mb-4 border-gray-100 border rounded-md p-3">
      <div className="flex">
        <div className="flex-grow">
          <div className="text-md leading-snug text-gray-800 font-medium mb-1">
            {title}
          </div>
          <div className="flex">
            <span className="font-normal text-gray-700">#{number}</span>
            {commit ? (
              <div className="ml-2 inline-flex items-center">
                {commit.status.contexts.map(({ state, context }) => (
                  <StatusCheckBox key={context} state={state} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div className="ml-5 flex flex-col">
          <button className="w-[8.5rem] px-5 py-2 rounded-md text-sm font-medium border focus:outline-none transition text-green-500 border-green-300 bg-white hover:text-white hover:bg-green-300 active:border-green-700 active:bg-green-700 focus:ring-green-300">
            Rebase on latest master
          </button>
        </div>
      </div>
    </div>
  )
}

function PullRequestList() {
  const query = useQuery('pull-requests', () =>
    window.electronAPI.fetchPullRequests()
  )

  return (
    <div className="p-5">
      {query.isLoading
        ? 'Loading'
        : query.data?.pullRequests.map((pr) => (
            <PullRequestListItem key={pr.url} {...pr} />
          ))}
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PullRequestList />
    </QueryClientProvider>
  )
}
