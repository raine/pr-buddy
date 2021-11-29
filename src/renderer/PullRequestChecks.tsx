import classNames from 'classnames'
import { match, not, __ } from 'ts-pattern'
import { sortBy } from 'lodash'
import React, { useState } from 'react'
import { CheckRun, PullRequest, StatusContext } from '../main/github'
import PullRequestCheckRow, { State } from './PullRequestCheckRow'
import { useInterval } from 'react-use'

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

const StatusContextCheckRow = (context: StatusContext) => {
  const { state, createdAt, targetUrl: url, context: title } = context
  const calcDuration = () =>
    state === 'PENDING' ? Date.now() - Date.parse(createdAt) : null
  const [duration, setDuration] = useState<number | null>(calcDuration())

  useInterval(() => {
    setDuration(calcDuration())
  }, 1000)

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

const CheckRunCheckRow = (checkRun: CheckRun) => {
  const { id, detailsUrl, name, startedAt, completedAt } = checkRun
  const state = checkRunToBuildState(checkRun)
  const calcDuration = () =>
    (completedAt ? Date.parse(completedAt) : Date.now()) - Date.parse(startedAt)
  const [duration, setDuration] = useState(calcDuration())

  useInterval(() => {
    setDuration(calcDuration())
  }, 1000)

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
            ).map((context) => (
              <StatusContextCheckRow key={context.id} {...context} />
            ))
          : null}

        {commit.flattenedCheckRuns
          ? sortBy(
              commit.flattenedCheckRuns,
              (checkRun) => checkRun.startedAt
            ).map((checkRun) => (
              <CheckRunCheckRow key={checkRun.id} {...checkRun} />
            ))
          : null}
      </div>
    </div>
  ) : null
}

export default React.memo(PullRequestChecks)
