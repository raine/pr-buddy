import * as fs from 'fs/promises'
import ini from 'ini'
import * as path from 'path'
import { MessageData, RebaseStatusMessageData } from './api'
import { exec, ExecResult, spawn } from './sh'
import { z } from 'zod'
import { fileExists } from './fs'

export const HOMEBREW_GIT_PATH = '/usr/local/bin/git'

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

type GitCommand = typeof exec & {
  spawn: typeof spawn
  repositoryPath: string
}

export const makeGit = (
  repositoryPath: string,
  gitBinPath?: string
): GitCommand => {
  const gitBin = gitBinPath ?? 'git'
  const env = {
    GIT_SSH_COMMAND: 'ssh -o BatchMode=yes',
    GIT_EDITOR: 'true'
  }
  const makeCmd = (command: string) =>
    `${gitBin} -C ${repositoryPath} ${command}`
  const _exec: typeof exec = (command) => exec(makeCmd(command), { env })
  const _spawn: typeof spawn = (command, outputCallback) =>
    spawn(makeCmd(command), outputCallback, env)
  return Object.assign(_exec, {
    spawn: _spawn,
    repositoryPath
  })
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

const getConflictedFiles = async (git: GitCommand): Promise<string[]> => {
  const { stdout } = await git(`diff --name-only --diff-filter=U`)
  return stdout.trim().split('\n')
}

const isRebaseInProgress = async (git: GitCommand): Promise<boolean> => {
  return fileExists(path.resolve(git.repositoryPath, '.git', 'REBASE_HEAD'))
}

const YARN_AUTO_FIXABLE_FILES = ['.pnp.cjs', 'yarn.lock']

type YarnConflictAutoFixResult = {
  result: 'AUTO_FIXED' | 'NOT_FIXABLE'
}

const autoYarnLockConflictResolve = async (
  git: GitCommand,
  emitMessage: (data: MessageData) => void,
  branch: string
): Promise<YarnConflictAutoFixResult> => {
  async function tryAutoFix(): Promise<YarnConflictAutoFixResult> {
    const conflictedFiles = await getConflictedFiles(git)
    const canAutoFixConflict = conflictedFiles.every((file) =>
      YARN_AUTO_FIXABLE_FILES.includes(file)
    )

    if (canAutoFixConflict) {
      emitMessage({ type: 'REBASE', branch, status: 'YARN_INSTALL' })
      await exec(`yarn install --cwd ${git.repositoryPath}`, {
        cwd: git.repositoryPath,
        env: {
          PATH: '/usr/local/bin:/usr/local/sbin:/usr/bin:/bin:/usr/sbin:/sbin'
        }
      })
      await git(`add ${conflictedFiles.join(' ')}`)
      await git.spawn(`rebase --continue`, (outputLine) => {
        const rebaseProgress = rebaseProgressFromOutputLine(branch, outputLine)
        if (rebaseProgress) emitMessage(rebaseProgress)
      })
      if (await isRebaseInProgress(git)) {
        return tryAutoFix()
      } else {
        return { result: 'AUTO_FIXED' }
      }
    } else {
      return { result: 'NOT_FIXABLE' }
    }
  }

  return tryAutoFix()
}

const rebaseProgressFromOutputLine = (
  branch: string,
  line: string
): RebaseStatusMessageData | undefined => {
  const m = line.match(/^Rebasing \((\d+)\/(\d+)\)/)
  if (!m) {
    return
  } else {
    return {
      type: 'REBASE',
      branch,
      status: 'REBASE_PROGRESS',
      info: {
        currentRebaseStep: parseInt(m[1]),
        totalRebaseSteps: parseInt(m[2])
      }
    }
  }
}

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
  const cleanup = async () => {
    if (beforeBranch !== branch) await git(`checkout ${beforeBranch}`)
    if (stashed) await git(`stash pop`)
  }
  await git(`checkout ${branch}`)
  const { code: rebaseExitCode, stderr } = await git.spawn(
    `rebase origin/${base}`,
    (outputLine) => {
      const rebaseProgress = rebaseProgressFromOutputLine(branch, outputLine)
      if (rebaseProgress) emitMessage(rebaseProgress)
    }
  )

  if (rebaseExitCode > 0) {
    const { result: yarnAutoFixResult } = await autoYarnLockConflictResolve(
      git,
      emitMessage,
      branch
    )
    if (yarnAutoFixResult === 'NOT_FIXABLE') {
      const couldNotApply = stderr.match(/error: could not apply.*/)
      await git(`rebase --abort`)
      await cleanup()
      return {
        result: 'FAILED_TO_REBASE' as const,
        message: couldNotApply?.[0]
      }
    }
  }

  emitMessage({ type: 'REBASE', branch, status: 'GIT_PUSH' })
  await git(`push --force origin HEAD:${branch}`)
  await cleanup()
  return { result: 'OK' }
}

export const fetchBranches = async (
  git: GitCommand,
  remote: string,
  branches: string[]
): Promise<void> => {
  await git(`fetch ${remote} ${branches.join(' ')}`)
}
