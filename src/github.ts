import { z } from 'zod'

const StatusState = z.union([z.literal('FAILURE'), z.literal('SUCCESS')])
export type StatusState = z.infer<typeof StatusState>

const LatestPullRequestsStatuses = z.array(
  z.object({
    title: z.string(),
    createdAt: z.string(),
    url: z.string().url(),
    changedFiles: z.number(),
    additions: z.number(),
    deletions: z.number(),
    number: z.number(),
    commit: z
      .object({
        commitUrl: z.string().url(),
        status: z.object({
          state: StatusState,
          contexts: z.array(
            z.object({
              state: StatusState,
              targetUrl: z.string().url(),
              description: z.string(),
              context: z.string()
            })
          )
        })
      })
      .optional()
  })
)

export type LatestPullRequestsStatuses = z.infer<
  typeof LatestPullRequestsStatuses
>

export type PullRequest = LatestPullRequestsStatuses[0]

const GithubUser = z.object({
  login: z.string(),
  name: z.string()
})

export type GithubUser = z.infer<typeof GithubUser>
