import * as path from 'path'
import * as fs from 'fs/promises'
import ini from 'ini'
import { sh, ExecResult } from './sh'

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

type GitCommand = (command: string) => Promise<ExecResult>

export const makeGit = (repositoryPath: string) => (command: string) =>
  sh(`git -C ${repositoryPath} ${command}`)

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

const rebase = async (git: GitCommand, base: string, branch: string) => {
  let stashed = false
  if (await isDirtyWorkingTree(git)) {
    await git(`stash push -m "TEMP"`)
    stashed = true
  }
  const currentBranch = trimmedStdout(await git(`rev-parse --abbrev-ref HEAD`))
  if (currentBranch !== branch) await git(`checkout ${branch}`)
  const { code: rebaseExitCode } = await git(`rebase ${base}`)
  if (rebaseExitCode > 0) await git(`rebase --abort`)
  if (currentBranch !== branch) await git(`checkout ${currentBranch}`)
  if (stashed) await git(`stash pop`)
}

export const fetchBranches = async (
  git: GitCommand,
  remote: string,
  branches: string[]
): Promise<void> => {
  await git(`fetch ${remote} ${branches.join(' ')}`)
}

// async function main() {
//   // const gitDir = '/Users/raine/code/temp/repos/git-testing/clone1'
//   const gitDir = '/Users/raine/Work/epicgames/devportal-src'
//   const git = makeGit(gitDir)
//   // const branch = 'feature'
//   const branch = 'release-mf-player-moderation'
//   await git('fetch')
//   if (!(await isBranchUpToDate(git, 'origin/master', branch))) {
//     await rebase(git, 'origin/master', branch)
//   }
// }
// main().catch((err) => console.log(err))
