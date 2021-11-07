import { z } from 'zod'
import {
  RequestParameters,
  graphql as GraphQL
} from '@octokit/graphql/dist-types/types'
import { omit } from 'lodash'
import { inspect } from 'util'

type GQL = (query: string, params?: RequestParameters) => Promise<unknown>

const GithubUser = z.object({
  login: z.string(),
  name: z.string()
})
export type GithubUser = z.infer<typeof GithubUser>

export const getUser = (gql: GQL): Promise<GithubUser> =>
  gql(
    `
{
  viewer {
    login
    name
  }
}`
  ).then((res: any) => GithubUser.parse(res.viewer))

const StatusState = z.union([
  z.literal('FAILURE'),
  z.literal('SUCCESS'),
  z.literal('PENDING'),
  z.literal('ERROR')
])
export type StatusState = z.infer<typeof StatusState>

const CheckStatusState = z.union([
  z.literal('QUEUED'),
  z.literal('IN_PROGRESS'),
  z.literal('COMPLETED'),
  z.literal('WAITING'),
  z.literal('PENDING'),
  z.literal('REQUESTED')
])

const CheckConclusionState = z.union([
  z.literal('ACTION_REQUIRED'),
  z.literal('TIMED_OUT'),
  z.literal('CANCELLED'),
  z.literal('FAILURE'),
  z.literal('SUCCESS'),
  z.literal('NEUTRAL'),
  z.literal('SKIPPED'),
  z.literal('STARTUP_FAILURE'),
  z.literal('STALE'),
  z.null()
])

const CheckRun = z.object({
  id: z.string(),
  checkSuite: z.object({
    app: z.object({
      name: z.string()
    })
  }),
  detailsUrl: z.string().url(),
  name: z.string(),
  summary: z.string().nullable(),
  title: z.string().nullable(),
  conclusion: CheckConclusionState,
  status: CheckStatusState,
  startedAt: z.string()
})

export type CheckRun = z.infer<typeof CheckRun>

const StatusContext = z.object({
  id: z.string(),
  createdAt: z.string(),
  state: StatusState,
  targetUrl: z.string().url().nullable(),
  description: z.string(),
  context: z.string()
})

export type StatusContext = z.infer<typeof StatusContext>

const MergeableStatus = z.union([
  z.literal('UNKNOWN'),
  z.literal('MERGEABLE'),
  z.literal('CONFLICTING')
])

export type MergeableStatus = z.infer<typeof MergeableStatus>

const LatestPullRequestsStatuses = z.array(
  z.object({
    title: z.string(),
    createdAt: z.string(),
    url: z.string().url(),
    changedFiles: z.number(),
    additions: z.number(),
    deletions: z.number(),
    number: z.number(),
    headRefName: z.string(),
    baseRefName: z.string(),
    mergeable: MergeableStatus,
    commit: z.object({
      commitUrl: z.string().url(),
      status: z.union([
        z.object({
          state: StatusState,
          contexts: z.array(StatusContext)
        }),
        z.null()
      ]),
      flattenedCheckRuns: z.array(CheckRun)
    })
  })
)

export type LatestPullRequestsStatuses = z.infer<
  typeof LatestPullRequestsStatuses
>
export type PullRequest = LatestPullRequestsStatuses[0]

export const getLatestPrsStatuses = async (
  gql: GQL,
  repo: string,
  author: string
): Promise<LatestPullRequestsStatuses> => {
  const q = `repo:${repo} author:${author} is:open type:pr`
  const query = `# gql
query($q: String!) {
  search(query: $q, type: ISSUE, first: 10) {
    edges {
      node {
        ... on PullRequest {
          title
          createdAt
          url
          changedFiles
          additions
          deletions
          number
          headRefName
          baseRefName
          mergeable
          commits(last: 1) {
            nodes {
              commit {
                commitUrl
                status {
                  state
                  contexts {
                    id
                    createdAt
                    state
                    targetUrl
                    description
                    context
                  }
                },
                checkSuites(last: 10) {
                  nodes {
                    status
                    url
                    conclusion
                    checkRuns(last: 10) {
                      nodes {
                        id
                        checkSuite {
                          app{
                            name
                          }
                        }
                        detailsUrl
                        name
                        summary
                        title
                        url
                        conclusion
                        status,
                        startedAt
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
  `
  return gql(query, { q }).then((res: any) => {
    try {
      return LatestPullRequestsStatuses.parse(
        res.search.edges.map((pr: any) => {
          const commit = pr.node.commits.nodes[0]?.commit
          return {
            // Only last commit of PR is interesting
            ...omit(pr.node, 'commits'),
            commit: {
              ...omit(commit, 'checkSuites'),
              // Checksuite is per app like travis or github actions. We don't
              // really care about the app so all check runs in a single list works
              // for now
              flattenedCheckRuns: commit.checkSuites.nodes.flatMap(
                (checkSuite: any) => checkSuite.checkRuns.nodes
              )
            }
          }
        })
      )
    } catch (err) {
      if (err instanceof z.ZodError)
        console.log(
          'Input object:',
          inspect(res, { colors: true, depth: Infinity })
        )
      throw err
    }
  })
}

type GraphQLClientOptions = {
  githubApiBaseUrl: string
  githubApiToken: string
}

export const makeGqlClient =
  (opts: GraphQLClientOptions) =>
  (query: string, params?: RequestParameters) => {
    const graphql = require('@octokit/graphql').graphql as GraphQL
    return graphql(query, {
      ...params,
      baseUrl: opts.githubApiBaseUrl,
      headers: {
        authorization: `token ${opts.githubApiToken}`
      }
    })
  }

// The api base url should probably be configurable because you can't
// reliably determine the base url like this
export function formatGithubApiBaseUrl(repositoryHost: string): string {
  if (repositoryHost === 'github.com') return 'https://api.github.com'
  else return `https://${repositoryHost}/api`
}
