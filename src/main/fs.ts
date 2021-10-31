import * as fs from 'fs/promises'

export const fileExists = (path: string): Promise<boolean> =>
  fs.stat(path).then(
    () => true,
    () => false
  )
