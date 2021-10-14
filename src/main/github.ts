import { z } from 'zod'
import { graphql } from '@octokit/graphql'
import { RequestParameters } from '@octokit/graphql/dist-types/types'
import _ from 'lodash'

type GraphQL = (query: string, params?: RequestParameters) => Promise<unknown>

const GithubUser = z.object({
  login: z.string(),
  name: z.string()
})
export type GithubUser = z.infer<typeof GithubUser>

export const getUser = (gql: GraphQL) =>
  gql(
    `
{
  viewer {
    login
    name
  }
}`
  ).then((res: any) => GithubUser.parse(res.viewer))

const StatusState = z.union([z.literal('FAILURE'), z.literal('SUCCESS')])
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
    workflowRun: z
      .object({
        workflow: z.object({
          name: z.string()
        })
      })
      .nullable(),
    app: z.object({
      name: z.string()
    })
  }),
  detailsUrl: z.string().url(),
  name: z.string(),
  summary: z.string().nullable(),
  title: z.string().nullable(),
  conclusion: CheckConclusionState,
  status: CheckStatusState
})

export type CheckRun = z.infer<typeof CheckRun>

const StatusContext = z.object({
  id: z.string(),
  state: StatusState,
  targetUrl: z.string().url(),
  description: z.string(),
  context: z.string()
})

export type StatusContext = z.infer<typeof StatusContext>

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
    mergeable: z.union([
      z.literal('UNKNOWN'),
      z.literal('MERGEABLE'),
      z.literal('CONFLICTING')
    ]),
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
  gql: GraphQL,
  repo: string,
  author: string
) => {
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
                    workflowRun {
                      runNumber
                      workflow {
                        name
                      }
                    }
                    checkRuns(last: 10) {
                      nodes {
                        id
                        checkSuite {
                          workflowRun {
                            workflow {
                              name
                            }
                          }
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
                        status
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
  return gql(query, { q }).then((res: any) =>
    LatestPullRequestsStatuses.parse(
      res.search.edges.map((pr: any) => {
        const commit = pr.node.commits.nodes[0]?.commit
        return {
          // Only last commit of PR is interesting
          ..._.omit(pr.node, 'commits'),
          commit: {
            ..._.omit(commit, 'checkSuites'),
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
  )
}

type GraphQLClientOptions = {
  githubApiBaseUrl: string
  githubApiToken: string
}

export const makeGqlClient =
  (opts: GraphQLClientOptions) => (query: string, params?: RequestParameters) =>
    graphql(query, {
      ...params,
      baseUrl: opts.githubApiBaseUrl,
      headers: {
        authorization: `token ${opts.githubApiToken}`
      }
    })

// The api base url should probably be configurable because you can't
// reliably determine the base url like this
export function formatGithubApiBaseUrl(repoHost: string): string {
  if (repoHost === 'github.com') return 'https://api.github.com'
  else return `https://${repoHost}/api`
}
