import { fetchPullRequests } from '../main/api'

export interface ElectronAPI {
  fetchPullRequests: () => ReturnType<typeof fetchPullRequests>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
