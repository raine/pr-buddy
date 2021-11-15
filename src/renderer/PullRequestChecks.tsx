import classNames from 'classnames'
import { match, not, __ } from 'ts-pattern'
import { sortBy } from 'lodash'
import React from 'react'
import { CheckRun, PullRequest, StatusContext } from '../main/github'
import PullRequestCheckRow, { State } from './PullRequestCheckRow'

type PullRequestChecksProps = {
  commit: PullRequest['commit']
  className?: string
}

const checkRunToBuildState = ({ status, conclusion }: CheckRun): State =>
  match([status, conclusion])
    .with([not('COMPLETED'), __], () => 'PENDING' as const)
    .with(['COMPLETED', 'SUCCESS'], () => 'SUCCESS' as const)
    .with(['COMPLETED', 'FAILURE'], () => 'FAILURE' as const)
    .with(['COMPLETED', 'STARTUP_FAILURE'], () => 'ERROR' as const)
    .otherwise(() => 'UNKNOWN' as const)

const statusContextToCheckRow = (context: StatusContext) => {
  const { state, createdAt, targetUrl: url, context: title } = context
  const duration =
    state === 'PENDING' ? Date.now() - Date.parse(createdAt) : null

  return (
    <PullRequestCheckRow
      key={context.context}
      state={state}
      duration={duration}
      url={url}
      name={title}
    />
  )
}

const checkRunToCheckRow = (checkRun: CheckRun) => {
  const { id, detailsUrl, name, startedAt, completedAt } = checkRun
  const state = checkRunToBuildState(checkRun)
  const duration =
    (completedAt ? Date.parse(completedAt) : Date.now()) - Date.parse(startedAt)

  return (
    <PullRequestCheckRow
      key={id}
      state={state}
      duration={duration}
      url={detailsUrl}
      name={name}
    />
  )
}

function PullRequestChecks({ commit, className }: PullRequestChecksProps) {
  return commit.status !== null || commit.flattenedCheckRuns?.length ? (
    <div className={classNames(className, 'bg-gray-50 rounded p-2')}>
      <span className="text-gray-600 font-medium text-sm">Checks:</span>
      <div className="grid gap-[4px] grid-cols-2 mt-1">
        {commit.status?.contexts
          ? sortBy(commit.status.contexts, (context) =>
              context.context.toLowerCase()
            ).map((context) => statusContextToCheckRow(context))
          : null}

        {commit.flattenedCheckRuns
          ? sortBy(
              commit.flattenedCheckRuns,
              (checkRun) => checkRun.startedAt
            ).map((checkRun) => checkRunToCheckRow(checkRun))
          : null}
      </div>
    </div>
  ) : null
}

export default React.memo(PullRequestChecks)
