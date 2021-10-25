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

export async function setOne<T extends keyof Settings>(
  key: T,
  value: Required<Settings>[T]
): Promise<void> {
  return settings.set(key, value)
}

export function setOneSync<T extends keyof Settings>(
  key: T,
  value: Required<Settings>[T]
): void {
  return settings.setSync(key, value)
}

export async function getOne<T extends keyof Settings>(
  key: T
): Promise<Settings[T]> {
  return settings.get(key) as unknown as Settings[T]
}
