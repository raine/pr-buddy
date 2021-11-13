import React from 'react'
import { match } from 'ts-pattern'
import { StatusContext } from '../main/github'
import { Checkmark, Cross, StateCircleIcon } from './StateCircle'

export function PullRequestCheckRow({
  context,
  state,
  targetUrl,
  createdAt
}: StatusContext) {
  const symbolClassName = 'flex-shrink-0 mr-2'
  const symbol = match(state)
    .with('SUCCESS', () => <Checkmark className={symbolClassName} />)
    .with('FAILURE', 'ERROR', () => <Cross className={symbolClassName} />)
    .with('PENDING', () => (
      <StateCircleIcon className={symbolClassName} state="PENDING" />
    ))
    .otherwise(() => (
      <StateCircleIcon className={symbolClassName} state="UNKNOWN" />
    ))

  const duration =
    state === 'PENDING'
      ? (Date.now() - Date.parse(createdAt)) / 1000 / 60
      : null

  const row = (
    <div className="border border-gray-150 py-1 px-2 rounded flex flex-row space-x-1 bg-white">
      <div className="flex flex-row overflow-hidden flex-grow items-center space-x-[1px]">
        {symbol}
        <div className="overflow-ellipsis whitespace-nowrap overflow-hidden text-gray-800 text-sm flex-grow">
          {context}
        </div>
      </div>
      {duration ? (
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {Math.round(duration)}m
        </div>
      ) : null}
    </div>
  )

  return targetUrl ? (
    <a href={targetUrl} target="_blank">
      {row}
    </a>
  ) : (
    row
  )
}

export default React.memo(PullRequestCheckRow)
