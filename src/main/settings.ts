import settings from 'electron-settings'
import { z } from 'zod'

const Settings = z
  .object({
    repositoryPath: z.string()
  })
  .partial()

export async function get() {
  return settings.get().then((obj) => Settings.parse(obj))
}
