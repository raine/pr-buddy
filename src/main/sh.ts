import * as cp from 'child_process'
import Debug from 'debug'

const debug = Debug('pr-buddy:sh')

export type ExecResult = {
  code: number
  stdout: string
  stderr: string
}

export const exec = (command: string): Promise<ExecResult> =>
  new Promise((resolve) => {
    debug('exec:', command)
    cp.exec(command, (err, stdout, stderr) => {
      const code = err ? { code: 1 } : { code: 0 }
      debug({ stdout, stderr, ...code })
      resolve({
        stdout,
        stderr,
        ...err,
        ...code
      })
    })
  })

export type SpawnResult = {
  code: number
  stdout: string
  stderr: string
}

export const spawn = (
  command: string,
  outputCallback: (outputLine: string) => void
): Promise<SpawnResult> => {
  return new Promise((resolve, reject) => {
    let stderr = ''
    let stdout = ''
    debug('spawn:', command)
    const p = cp.spawn(command, { shell: true })
    p.stderr.on('data', (data) => {
      const str = data.toString()
      stderr += str
      debug('stderr:', str)
      outputCallback(str)
    })
    p.stdout.on('data', (data) => {
      const str = data.toString()
      stdout += str
      debug('stdout:', str)
      outputCallback(str)
    })
    p.on('close', (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr
      })
    })
    p.on('error', (err) => {
      reject(err)
    })
  })
}
