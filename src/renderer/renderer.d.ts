import {
  fetchPullRequests,
  MessageData,
  rebaseBranchOnLatestBase
} from '../main/api'

type Unsub = () => void

export interface ElectronAPI {
  fetchPullRequests: typeof fetchPullRequests
  rebaseBranchOnLatestBase: typeof rebaseBranchOnLatestBase
  subscribe: (
    channel: 'message',
    listener: (data: MessageData) => void
  ) => Unsub
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
