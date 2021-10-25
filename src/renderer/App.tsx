import React, { useEffect, useReducer } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { MemoryRouter as Router, Route, Switch } from 'react-router-dom'
import { match, select } from 'ts-pattern'
import { MessageData } from '../main/api'
import ApiTokenSetup from './ApiTokenSetup'
import './App.global.css'
import useMessages from './hooks/useMessages'
import OpenRepositoryView from './OpenRepositoryView'
import PullRequestList from './PullRequestList'

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
                repositoryHost={location.state.repositoryHost}
              />
            )}
          />
          <Route
            path="/"
            exact
            component={() => {
              if (repositoryPath) {
                return <PullRequestList repositoryPath={repositoryPath} />
              } else {
                return <OpenRepositoryView />
              }
            }}
          />
        </Switch>{' '}
      </Router>
    </QueryClientProvider>
  )
}
