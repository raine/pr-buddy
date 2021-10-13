import { fetchPullRequests, rebaseBranchOnLatestBase } from '../main/api'

export interface ElectronAPI {
  fetchPullRequests: typeof fetchPullRequests
  rebaseBranchOnLatestBase: typeof rebaseBranchOnLatestBase
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
