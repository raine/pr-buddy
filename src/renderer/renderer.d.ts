import { FetchPullRequests } from '../main/main'

export interface ElectronAPI {
  fetchPullRequests: () => FetchPullRequests
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
