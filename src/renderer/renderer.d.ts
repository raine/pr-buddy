import { API_FUNCTIONS, MessageData } from '../main/api'

type Unsub = () => void
type ApiFunctions = typeof API_FUNCTIONS
type Api = { [P in keyof ApiFunctions]: OmitThisParameter<ApiFunctions[P]> }

export type ElectronAPI = Api & {
  subscribe: (
    channel: 'message',
    listener: (data: MessageData) => void
  ) => Unsub
}

export type InitData = {
  repositoryPath?: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    initData: InitData
  }
}
