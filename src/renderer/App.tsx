import './App.global.css'
import { MemoryRouter as Router, Switch, Route } from 'react-router-dom'
import { match, select } from 'ts-pattern'
import React, { useEffect, useReducer } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import PullRequestList from './PullRequestList'
import { MessageData } from '../main/api'
import useMessages from './hooks/useMessages'
import ApiTokenSetup from './ApiTokenSetup'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

type AppProps = { repositoryPath?: string }
export type AppState = AppProps
export default function App(props: AppProps) {
  const [appState, dispatch] = useReducer<
    (prevState: AppState, message: MessageData) => AppState
  >(
    (prevState, message) =>
      match(message)
        .with(
          { type: 'SET_REPOSITORY_PATH', value: select() },
          (repositoryPath) => ({ ...prevState, repositoryPath })
        )
        .otherwise(() => prevState),
    props
  )

  useEffect(() => {
    //@ts-ignore
    window.appState = appState
  }, [appState])

  useMessages(dispatch)
  const { repositoryPath } = appState

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Switch>
          <Route
            path="/set-api-token"
            render={({ location }: any) => (
              <ApiTokenSetup
                remoteRepoPath={location.state.remoteRepoPath}
                repositoryPath={repositoryPath!}
              />
            )}
          />
          <Route
            path="/"
            component={() => {
              return repositoryPath ? (
                <div className="p-5">
                  <PullRequestList repositoryPath={repositoryPath} />
                </div>
              ) : (
                <div className="flex justify-center h-[100vh] items-center bg-gray-50">
                  <div className="mt-[-3rem]">
                    <button
                      onClick={() => {
                        void window.electronAPI.showOpenRepositoryDialog()
                      }}
                      className="px-5 hover:bg-gray-100 py-2 transition active:shadow-inner font-medium rounded-md text-2xl border shadow text-gray-600 border-gray-300 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Open a repository
                    </button>
                  </div>
                </div>
              )
            }}
          />
        </Switch>{' '}
      </Router>
    </QueryClientProvider>
  )
}
