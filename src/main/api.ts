import { ipcMain } from 'electron'
import { mainWindow } from './main'
import {
  LatestPullRequestsStatuses,
  formatGithubApiBaseUrl,
  makeGqlClient,
  getLatestPrsStatuses,
  getUser,
  PullRequest
} from './github'
import * as settings from './settings'
import {
  fetchBranches,
  getRepositoryRemoteData,
  isBranchUpToDate,
  makeGit,
  rebase
} from './git'

import pReduce from 'p-reduce'

export type LocalBranchesUpToDateMap = {
  [headRefName: string]: boolean
}

export type FetchPullRequests = {
  // This data comes from github
  pullRequests: LatestPullRequestsStatuses
  // This data comes from git command
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
  remoteRepoPath: string
}

export type RebaseMessageData =
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

export type RebaseStatus = RebaseMessageData['status']

export type FetchPullRequestsMessageData = {
  type: 'FETCH_PULL_REQUESTS'
  status: 'START' | 'COMPLETE'
}
export type MessageData = RebaseMessageData | FetchPullRequestsMessageData

export type MessageListener = (data: MessageData) => void

export function emitMessage(data: MessageData) {
  mainWindow?.webContents.send('message', data)
}

export async function fetchPullRequests(): Promise<FetchPullRequests> {
  emitMessage({ type: 'FETCH_PULL_REQUESTS', status: 'START' })
  const { repositoryPath, githubApiToken } = await settings.get()
  const remote = await getRepositoryRemoteData(repositoryPath)
  const { remoteRepoPath } = remote
  const githubApiBaseUrl = formatGithubApiBaseUrl(remote.repoHost)
  const gql = makeGqlClient({ githubApiBaseUrl, githubApiToken })
  const { login } = await getUser(gql)
  const pullRequests = await getLatestPrsStatuses(gql, remoteRepoPath, login)
  const git = makeGit(repositoryPath)
  const headRefNames = pullRequests.map((pr) => pr.headRefName)
  const baseRefNames = [...new Set(pullRequests.map((pr) => pr.baseRefName))]

  // With git command, check up-to-date-with-master status of PR's branches
  await fetchBranches(git, remote.name, [...headRefNames, ...baseRefNames])
  const localBranchesUpToDateMap = await pReduce<
    PullRequest,
    FetchPullRequests['localBranchesUpToDateMap']
  >(
    pullRequests,
    async (acc, pr) => ({
      ...acc,
      [pr.headRefName]: await isBranchUpToDate(
        git,
        `${remote.name}/${pr.baseRefName}`,
        `${remote.name}/${pr.headRefName}`
      )
    }),
    {}
  )

  emitMessage({ type: 'FETCH_PULL_REQUESTS', status: 'COMPLETE' })

  return {
    pullRequests,
    localBranchesUpToDateMap,
    remoteRepoPath
  }
}

export async function rebaseBranchOnLatestBase(
  headRefName: string,
  baseRefName: string
): Promise<
  { result: 'OK' } | { result: 'FAILED_TO_REBASE'; message: string | undefined }
> {
  const { repositoryPath } = await settings.get()
  const git = makeGit(repositoryPath)
  emitMessage({ type: 'REBASE', branch: headRefName, status: 'GIT_FETCH' })
  await fetchBranches(git, 'origin', [baseRefName, headRefName])
  emitMessage({ type: 'REBASE', branch: headRefName, status: 'REBASE' })
  return rebase(emitMessage, git, baseRefName, headRefName).finally(() => {
    emitMessage({ type: 'REBASE', branch: headRefName, status: 'COMPLETE' })
  })
}

;[fetchPullRequests, rebaseBranchOnLatestBase].forEach((fn) => {
  ipcMain.handle(fn.name, (event, ...args) => (fn as any)(...args))
})