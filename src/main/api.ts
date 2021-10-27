import { dialog, ipcMain, BrowserWindow } from 'electron'
import pReduce from 'p-reduce'
import {
  fetchBranches,
  getRepositoryConfig,
  isBranchUpToDate,
  makeGit,
  rebase
} from './git'
import {
  formatGithubApiBaseUrl,
  getLatestPrsStatuses,
  getUser,
  LatestPullRequestsStatuses,
  makeGqlClient,
  PullRequest
} from './github'
import * as settings from './settings'

export type RebaseStatusMessageData =
  | {
      type: 'REBASE'
      branch: string
      status:
        | 'GIT_PUSH'
        | 'COMPLETE'
        | 'GIT_FETCH'
        | 'REBASE'
        | 'FAILED_TO_REBASE'
    }
  | {
      type: 'REBASE'
      branch: string
      status: 'REBASE_PROGRESS'
      info: {
        currentRebaseStep: number
        totalRebaseSteps: number
      }
    }

export type RebaseStatus = RebaseStatusMessageData['status']

export type FetchingPullRequestsMessageData = {
  type: 'FETCHING_PULL_REQUESTS'
  status: 'START' | 'COMPLETE'
}

export type RefreshPullRequestsMessageData = { type: 'REFRESH_PULL_REQUESTS' }
export type SetRepositoryPathMessageData = {
  type: 'SET_REPOSITORY_PATH'
  value: string
}

export type MessageData =
  | RebaseStatusMessageData
  | FetchingPullRequestsMessageData
  | RefreshPullRequestsMessageData
  | SetRepositoryPathMessageData

export type MessageListener = (data: MessageData) => void

export const emitMessageToWindow =
  (window: BrowserWindow) =>
  (data: MessageData): void => {
    window.webContents.send('message', data)
  }

export type LocalBranchesUpToDateMap = {
  [headRefName: string]: boolean
}

export type FetchPullRequestsResponse = FetchPullRequestsOk | NoTokenInGitConfig

export type FetchPullRequestsOk = {
  result: 'OK'
  // This data comes from github
  pullRequests: LatestPullRequestsStatuses
  // This data comes from git command
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
  remoteRepoPath: string
}

export type NoTokenInGitConfig = {
  result: 'NO_TOKEN_IN_GIT_CONFIG'
  remoteRepoPath: string
  repositoryHost: string
}

export async function fetchPullRequests(
  this: BrowserWindow,
  repositoryPath: string
): Promise<FetchPullRequestsOk | NoTokenInGitConfig> {
  const emit = emitMessageToWindow(this)
  try {
    emit({ type: 'FETCHING_PULL_REQUESTS', status: 'START' })
    const repoConfig = await getRepositoryConfig(repositoryPath)
    const { remoteRepoPath, remoteName, repositoryHost, githubApiToken } =
      repoConfig
    if (!githubApiToken)
      return {
        result: 'NO_TOKEN_IN_GIT_CONFIG',
        remoteRepoPath,
        repositoryHost
      }

    const githubApiBaseUrl = formatGithubApiBaseUrl(repositoryHost)
    const gql = makeGqlClient({ githubApiBaseUrl, githubApiToken })
    const { login } = await getUser(gql)
    const pullRequests = await getLatestPrsStatuses(gql, remoteRepoPath, login)
    const { gitBinPath } = await settings.get()
    const git = makeGit(repositoryPath, gitBinPath)
    const headRefNames = pullRequests.map((pr) => pr.headRefName)
    const baseRefNames = [...new Set(pullRequests.map((pr) => pr.baseRefName))]

    // With git command, check up-to-date-with-master status of PR's branches
    await fetchBranches(git, remoteName, [...headRefNames, ...baseRefNames])
    const localBranchesUpToDateMap = await pReduce<
      PullRequest,
      FetchPullRequestsOk['localBranchesUpToDateMap']
    >(
      pullRequests,
      async (acc, pr) => ({
        ...acc,
        [pr.headRefName]: await isBranchUpToDate(
          git,
          `${remoteName}/${pr.baseRefName}`,
          `${remoteName}/${pr.headRefName}`
        )
      }),
      {}
    )

    return {
      result: 'OK',
      pullRequests,
      localBranchesUpToDateMap,
      remoteRepoPath
    }
  } finally {
    emit({ type: 'FETCHING_PULL_REQUESTS', status: 'COMPLETE' })
  }
}

export async function rebaseBranchOnLatestBase(
  this: BrowserWindow,
  repositoryPath: string,
  headRefName: string,
  baseRefName: string
): Promise<
  | { result: 'OK'; pullRequests: FetchPullRequestsOk }
  | { result: 'FAILED_TO_REBASE'; message: string | undefined }
> {
  const emit = emitMessageToWindow(this)
  const { gitBinPath } = await settings.get()
  const git = makeGit(repositoryPath, gitBinPath)
  emit({ type: 'REBASE', branch: headRefName, status: 'GIT_FETCH' })
  await fetchBranches(git, 'origin', [baseRefName, headRefName])
  emit({ type: 'REBASE', branch: headRefName, status: 'REBASE' })
  return rebase(emit, git, baseRefName, headRefName)
    .then(async (res) => {
      if (res.result === 'OK') {
        // It ended up being slightly simpler to return new pr data in the
        // rebase response and mutate query data in onSuccess of mutation
        // - We need to wait a bit to refresh PRs so that checks data is updated
        // - With this, we can keep the rebase button disabled as long as
        //   mutation call is loading
        emit({ type: 'FETCHING_PULL_REQUESTS', status: 'START' })
        const pullRequests = await fetchPullRequests.bind(this)(repositoryPath)
        if (pullRequests.result === 'NO_TOKEN_IN_GIT_CONFIG') {
          throw Error('No token in git config')
        }

        return {
          ...res,
          pullRequests
        }
      } else {
        return res
      }
    })
    .finally(() => {
      emit({ type: 'REBASE', branch: headRefName, status: 'COMPLETE' })
    })
}

export async function showOpenRepositoryDialog(this: BrowserWindow) {
  const emit = emitMessageToWindow(this)
  const result = await dialog.showOpenDialog(this, {
    properties: ['openDirectory']
  })

  if (!result.canceled) {
    // TODO: Handle is not git repo?
    const repositoryPath = result.filePaths[0]
    emit({ type: 'SET_REPOSITORY_PATH', value: repositoryPath })
    void settings.setOne('lastRepositoryPath', repositoryPath)
  }
}

export const API_FUNCTIONS = {
  rebaseBranchOnLatestBase,
  fetchPullRequests,
  showOpenRepositoryDialog
}

function browserWindowFromEvent(
  event: Electron.IpcMainInvokeEvent
): BrowserWindow {
  //@ts-ignore
  return event.sender.getOwnerBrowserWindow()
}

ipcMain.handle('fetchPullRequests', (event, ...args) =>
  (fetchPullRequests as Function).bind(browserWindowFromEvent(event))(...args)
)

ipcMain.handle('rebaseBranchOnLatestBase', (event, ...args) =>
  (rebaseBranchOnLatestBase as Function).bind(browserWindowFromEvent(event))(
    ...args
  )
)

ipcMain.handle('showOpenRepositoryDialog', (event, ...args) =>
  (showOpenRepositoryDialog as Function).bind(browserWindowFromEvent(event))(
    ...args
  )
)
