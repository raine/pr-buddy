import classNames from 'classnames'
import { sortBy } from 'lodash'
import React from 'react'
import { match, not, __ } from 'ts-pattern'
import { PullRequest } from '../main/github'
import PullRequestCheckRow from './PullRequestCheckRow'

type PullRequestChecksProps = {
  commit: PullRequest['commit']
  className?: string
}

function PullRequestChecks({ commit, className }: PullRequestChecksProps) {
  return commit.status !== null || commit.flattenedCheckRuns?.length ? (
    <div className={classNames(className, 'bg-gray-50 rounded p-2')}>
      <span className="text-gray-600 font-medium text-sm">Checks:</span>
      <div className="grid gap-[4px] grid-cols-2 mt-1">
        {match(commit)
          .with({ status: not(__.nullish) }, (commit) => {
            return sortBy(commit.status.contexts, (context) =>
              Date.parse(context.createdAt)
            ).map((context) => (
              <PullRequestCheckRow key={context.context} {...context} />
            ))
          })
          .otherwise(() => null)}
      </div>
    </div>
  ) : null
}

export default React.memo(PullRequestChecks)
