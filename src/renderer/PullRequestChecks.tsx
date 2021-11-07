import { sortBy } from 'lodash'
import React from 'react'
import { match, not, __ } from 'ts-pattern'
import { PullRequest } from '../main/github'
import { CheckRunStateCircle, StatusContextStateCircle } from './StateCircle'

type PullRequestChecksProps = {
  commit: PullRequest['commit']
}

function PullRequestChecks({ commit }: PullRequestChecksProps) {
  return (
    <div className="flex mt-2">
      {commit.status !== null || commit.flattenedCheckRuns?.length ? (
        <div className="inline-flex items-center">
          <span className="text-gray-600 font-semibold mr-2">Checks:</span>{' '}
          {match(commit)
            .with({ status: not(__.nullish) }, (commit) => {
              const sortedContexts = sortBy(commit.status.contexts, (context) =>
                Date.parse(context.createdAt)
              )
              return sortedContexts.map((context) => (
                <StatusContextStateCircle key={context.id} {...context} />
              ))
            })
            .with({ flattenedCheckRuns: __ }, (commit) => {
              const sortedCheckRuns = sortBy(
                commit.flattenedCheckRuns,
                (checkRun) => Date.parse(checkRun.startedAt)
              )
              return sortedCheckRuns.map((checkRun) => (
                <CheckRunStateCircle key={checkRun.id} {...checkRun} />
              ))
            })
            .otherwise(() => null)}
        </div>
      ) : null}
    </div>
  )
}

export default React.memo(PullRequestChecks)
