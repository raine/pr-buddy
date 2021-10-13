import { ipcMain } from 'electron'
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

export type LocalBranchesUpToDateMap = { [headRefName: string]: boolean }

export type FetchPullRequests = {
  pullRequests: LatestPullRequestsStatuses
  localBranchesUpToDateMap: LocalBranchesUpToDateMap
}

export async function fetchPullRequests(): Promise<FetchPullRequests> {
  const { repositoryPath, githubApiToken } = await settings.get()
  const remote = await getRepositoryRemoteData(repositoryPath)
  const githubApiBaseUrl = formatGithubApiBaseUrl(remote.repoHost)
  const gql = makeGqlClient({ githubApiBaseUrl, githubApiToken })
  const { login } = await getUser(gql)
  const pullRequests = await getLatestPrsStatuses(
    gql,
    remote.remoteRepoPath,
    login
  )
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

  return {
    pullRequests,
    localBranchesUpToDateMap
  }
}

export async function rebaseBranchOnLatestBase(
  headRefName: string,
  baseRefName: string
): Promise<void> {
  const { repositoryPath } = await settings.get()
  const git = makeGit(repositoryPath)
  await fetchBranches(git, 'origin', [baseRefName, headRefName])
  await rebase(git, baseRefName, headRefName)
}

ipcMain.handle('fetchPullRequests', fetchPullRequests)
ipcMain.handle('rebaseBranchOnLatestBase', (event, headRefName, baseRefName) =>
  rebaseBranchOnLatestBase(headRefName, baseRefName)
)
