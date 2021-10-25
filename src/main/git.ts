import * as fs from 'fs/promises'
import ini from 'ini'
import * as path from 'path'
import { MessageData } from './api'
import { exec, ExecResult, spawn } from './sh'
import { z } from 'zod'

const GitConfig = z.object({
  'remote "origin"': z.object({
    url: z.string()
  }),
  'pr-buddy': z
    .object({
      'github-api-token': z.string()
    })
    .optional()
    .optional()
})

export async function readRepositoryGitConfig(repoPath: string) {
  const configPath = path.join(repoPath, '.git/config')
  return ini.parse(await fs.readFile(configPath, 'utf8'))
}

type RemoteUrlData = {
  repositoryHost: string
  remoteRepoPath: string
}

type RepoConfig = RemoteUrlData & {
  remoteName: string
  githubApiToken?: string
}

export async function getRepositoryConfig(
  repoPath: string
): Promise<RepoConfig> {
  const config = GitConfig.parse(await readRepositoryGitConfig(repoPath))
  const remoteUrl = config['remote "origin"'].url
  const githubApiToken = config['pr-buddy']?.['github-api-token']
  return {
    ...parseRemoteUrl(remoteUrl),
    githubApiToken,
    remoteName: 'origin'
  }
}

export function parseRemoteUrl(url: string): RemoteUrlData {
  const sshGitUrlMatch = url.match(/git@(.+?):(.+?).git/)
  if (sshGitUrlMatch) {
    const [repositoryHost, remoteRepoPath] = sshGitUrlMatch.slice(1)
    return { repositoryHost, remoteRepoPath }
  }

  const parsedUrl = new URL(url)
  return {
    repositoryHost: parsedUrl.host,
    remoteRepoPath: parsedUrl.pathname.replace(/^\//, '').replace(/\.git$/, '')
  }
}

type GitCommand = typeof exec & { spawn: typeof spawn }

export const makeGit = (
  repositoryPath: string,
  gitBinPath?: string
): GitCommand => {
  const gitBin = gitBinPath ?? 'git'
  const env = { GIT_SSH_COMMAND: 'ssh -o BatchMode=yes' }
  const makeCmd = (command: string) =>
    `${gitBin} -C ${repositoryPath} ${command}`
  const _exec: typeof exec = (command) => exec(makeCmd(command), env)
  const _spawn: typeof spawn = (command, outputCallback) =>
    spawn(makeCmd(command), outputCallback, env)
  return Object.assign(_exec, { spawn: _spawn })
}

const isDirtyWorkingTree = (git: GitCommand) =>
  git(`diff --quiet`).then((res) => res.code > 0)

export const isBranchUpToDate = async (
  git: GitCommand,
  base: string,
  branch: string
): Promise<boolean> =>
  git(`merge-base --is-ancestor ${base} ${branch}`).then(
    ({ code }) => code === 0
  )

const trimmedStdout = (out: ExecResult): string => out.stdout.trim()

export const rebase = async (
  emitMessage: (data: MessageData) => void,
  git: GitCommand,
  base: string,
  branch: string
): Promise<
  | { result: 'OK' }
  | {
      result: 'FAILED_TO_REBASE'
      message: string | undefined
    }
> => {
  let stashed = false
  if (await isDirtyWorkingTree(git)) {
    await git(`stash push -m "TEMP"`)
    stashed = true
  }
  const beforeBranch = trimmedStdout(await git(`rev-parse --abbrev-ref HEAD`))
  await git(`checkout ${branch}`)
  const { code: rebaseExitCode, stderr } = await git.spawn(
    `rebase origin/${base}`,
    (outputLine) => {
      const m = outputLine.match(/^Rebasing \((\d+)\/(\d+)\)/)
      if (m) {
        emitMessage({
          type: 'REBASE',
          branch,
          status: 'REBASE_PROGRESS',
          info: {
            currentRebaseStep: parseInt(m[1]),
            totalRebaseSteps: parseInt(m[2])
          }
        })
      }
    }
  )
  if (rebaseExitCode > 0) {
    const couldNotApply = stderr.match(/error: could not apply.*/)
    await git(`rebase --abort`)
    if (beforeBranch !== branch) await git(`checkout ${beforeBranch}`)
    return {
      result: 'FAILED_TO_REBASE' as const,
      message: couldNotApply?.[0]
    }
  } else {
    emitMessage({ type: 'REBASE', branch, status: 'GIT_PUSH' })
    await git(`push --force origin HEAD:${branch}`)
    if (beforeBranch !== branch) await git(`checkout ${beforeBranch}`)
    if (stashed) await git(`stash pop`)
    return { result: 'OK' }
  }
}

export const fetchBranches = async (
  git: GitCommand,
  remote: string,
  branches: string[]
): Promise<void> => {
  await git(`fetch ${remote} ${branches.join(' ')}`)
}
