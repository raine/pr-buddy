import * as cp from 'child_process'
import Debug from 'debug'

const debug = Debug('pr-buddy:sh')

export type ExecResult = {
  code: number
  stdout: string
  stderr: string
}

export const sh = (command: string): Promise<ExecResult> =>
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
