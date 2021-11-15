import classNames from 'classnames'
import React from 'react'
import { match } from 'ts-pattern'
import { Checkmark, Cross, StateCircleIcon } from './StateCircle'

export type State = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN' | 'ERROR'

type PullRequestCheckRowProps = {
  name: string
  duration: number | null
  state: State
  url: string | null
}

export function PullRequestCheckRow({
  state,
  name,
  duration,
  url
}: PullRequestCheckRowProps) {
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

  const row = (
    <div
      className={classNames(
        'border border-gray-200 py-1 px-2 rounded flex flex-row space-x-1 bg-white',
        { ['!border-red-200']: state === 'FAILURE' },
        { ['!border-amber-200']: state === 'PENDING' }
      )}
    >
      <div className="flex flex-row overflow-hidden flex-grow items-center space-x-[2px]">
        {symbol}
        <div className="overflow-ellipsis whitespace-nowrap overflow-hidden text-gray-800 text-sm flex-grow">
          {name}
        </div>
      </div>
      {duration !== null ? (
        <div
          className={classNames('text-sm text-gray-500 whitespace-nowrap', {
            'text-amber-500': state === 'PENDING'
          })}
        >
          {Math.round(duration / 1000 / 60)}m
        </div>
      ) : null}
    </div>
  )

  return url ? (
    <a href={url} target="_blank">
      {row}
    </a>
  ) : (
    row
  )
}

export default React.memo(PullRequestCheckRow)
