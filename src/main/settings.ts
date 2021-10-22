import settings from 'electron-settings'
import { z } from 'zod'

const Settings = z
  .object({
    lastRepositoryPath: z.string(),
    gitBinPath: z.string()
  })
  .partial()

export type Settings = z.infer<typeof Settings>

export async function get(): Promise<Settings> {
  return settings.get().then((obj) => Settings.parse(obj))
}

export async function set(obj: Settings): Promise<void> {
  return settings.set(obj)
}
