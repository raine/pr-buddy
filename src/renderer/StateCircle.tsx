import classNames from 'classnames'
import React from 'react'
import { match, not, __ } from 'ts-pattern'
import { CheckRun, StatusContext } from '../main/github'
import './App.global.css'

type StateCircleProps = {
  state: 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN'
}

function StateCircle({ state }: StateCircleProps) {
  const color = match(state)
    .with('SUCCESS', () => 'bg-emerald-500')
    .with('FAILURE', () => 'bg-red-500')
    .with('PENDING', () => 'bg-amber-500')
    .otherwise(() => 'bg-black')

  return (
    <div
      className={classNames(
        { 'animate-pulse': state === 'PENDING' },
        'w-[12px] h-[12px] rounded-full mr-1 last:mr-0',
        color
      )}
    ></div>
  )
}

export function CheckRunStateCircle({ status, conclusion }: CheckRun) {
  const state: StateCircleProps['state'] = match([status, conclusion])
    .with([not('COMPLETED'), __], () => 'PENDING' as const)
    .with(['COMPLETED', 'SUCCESS'], () => 'SUCCESS' as const)
    .with(
      ['COMPLETED', 'FAILURE'],
      ['COMPLETED', 'STARTUP_FAILURE'],
      () => 'FAILURE' as const
    )
    .otherwise(() => 'UNKNOWN' as const)

  return <StateCircle state={state} />
}

export function StatusContextStateCircle(context: StatusContext) {
  return <StateCircle state={context.state} />
}
