import * as path from 'path'
import * as cp from 'child_process'
import * as fs from 'fs/promises'
import ini from 'ini'
import { exec, ExecResult, spawn } from './sh'
import { RebaseStatus } from './api'

export async function readRepositoryGitConfig(repoPath: string) {
  const configPath = path.join(repoPath, '.git/config')
  return ini.parse(await fs.readFile(configPath, 'utf8'))
}

type RemoteUrlData = {
  repoHost: string
  remoteRepoPath: string
}

type RemoteData = RemoteUrlData & { name: string }

export async function getRepositoryRemoteData(
  repoPath: string
): Promise<RemoteData> {
  const config = await readRepositoryGitConfig(repoPath)
  const remoteUrl = config['remote "origin"']?.url
  if (!remoteUrl) throw new Error('Could not parse repository origin url')
  return { ...parseRemoteUrl(remoteUrl), name: 'origin' }
}

export function parseRemoteUrl(url: string): RemoteUrlData {
  const sshGitUrlMatch = url.match(/git@(.+?):(.+?).git/)
  if (sshGitUrlMatch) {
    const [repoHost, remoteRepoPath] = sshGitUrlMatch.slice(1)
    return { repoHost, remoteRepoPath }
  }

  const parsedUrl = new URL(url)
  return {
    repoHost: parsedUrl.host,
    remoteRepoPath: parsedUrl.pathname.replace(/^\//, '').replace(/\.git$/, '')
  }
}

type GitCommand = typeof exec & { spawn: typeof spawn }

export const makeGit = (repositoryPath: string): GitCommand => {
  const makeCmd = (command: string) => `git -C ${repositoryPath} ${command}`
  const _exec: typeof exec = (command) => exec(makeCmd(command))
  const _spawn: typeof spawn = (command, outputCallback) =>
    spawn(makeCmd(command), outputCallback)
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
  emit: (status: RebaseStatus, info?: string) => void,
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
  const currentBranch = trimmedStdout(await git(`rev-parse --abbrev-ref HEAD`))
  await git(`checkout origin/${branch}`)
  const { code: rebaseExitCode, stderr } = await git.spawn(
    `rebase ${base}`,
    (outputLine) => {
      const m = outputLine.match(/^Rebasing.*/)
      if (m) emit('REBASE_PROGRESS', m[0].trim())
    }
  )
  if (rebaseExitCode > 0) {
    const couldNotApply = stderr.match(/.*\rerror: could not apply.*/)
    await git(`rebase --abort`)
    await git(`checkout ${currentBranch}`)
    return {
      result: 'FAILED_TO_REBASE' as const,
      message: couldNotApply?.[0]
    }
  } else {
    emit('GIT_PUSH')
    // await git(`push --force origin HEAD:${branch}`)
    await git(`checkout ${currentBranch}`)
    if (stashed) await git(`stash pop`)
    return { result: 'OK' as const }
  }
}

export const fetchBranches = async (
  git: GitCommand,
  remote: string,
  branches: string[]
): Promise<void> => {
  await git(`fetch ${remote} ${branches.join(' ')}`)
}
