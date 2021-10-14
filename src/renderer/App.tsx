import './App.global.css'
import React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import PullRequestList from './PullRequestList'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-5">
        <PullRequestList />
      </div>
    </QueryClientProvider>
  )
}
