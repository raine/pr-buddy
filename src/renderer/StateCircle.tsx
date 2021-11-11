import classNames from 'classnames'
import React from 'react'
import { match, not, __ } from 'ts-pattern'
import { CheckRun, StatusContext } from '../main/github'
import { usePopperTooltip } from 'react-popper-tooltip'

export function Checkmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="22.25 112.5 802.25 622"
      xmlns="http://www.w3.org/2000/svg"
      className={classNames(
        'h-[12px] w-[12px] inline-block fill-current text-emerald-500',
        className
      )}
    >
      <g>
        <path d="M299 522l396 -396c18,-18 47,-18 65,0l51 51c18,18 18,47 0,64l-479 480c-18,18 -47,18 -65,0l-232 -232c-17,-17 -17,-46 0,-64l52 -51c17,-18 46,-18 64,0l148 148z" />
      </g>
    </svg>
  )
}

export function Cross({ className }: { className?: string }) {
  return (
    <svg
      viewBox="36.626 36.626 772.883 772.883"
      xmlns="http://www.w3.org/2000/svg"
      className={classNames(
        'h-[10px] w-[10px] inline-block fill-current text-red-500',
        className
      )}
    >
      <g>
        <path d="M423 300l237 -237c81,-81 204,43 123,124l-236 236 236 237c81,81 -42,204 -123,123l-237 -236 -236 236c-81,81 -205,-42 -123,-123l236 -237 -237 -236c-81,-81 43,-205 124,-124l236 237z" />
      </g>
    </svg>
  )
}

type State = 'SUCCESS' | 'FAILURE' | 'PENDING' | 'UNKNOWN' | 'ERROR'
type StateCircleProps = {
  state: State
  className?: string
  pulse?: boolean
}

export function StateCircleIcon({
  state,
  className,
  pulse = true
}: StateCircleProps) {
  const color = match(state)
    .with('SUCCESS', () => 'bg-emerald-400')
    .with('FAILURE', 'ERROR', () => 'bg-red-400')
    .with('PENDING', () => 'bg-amber-400')
    .otherwise(() => 'bg-gray-400')

  return (
    <div
      className={classNames(
        className,
        { 'animate-pulse': state === 'PENDING' && pulse === true },
        'w-[12px] h-[12px] rounded-full',
        color
      )}
    ></div>
  )
}

type TooltipProps = {
  name: string
  state: State
  setTooltipRef: React.Dispatch<React.SetStateAction<HTMLElement | null>>
}

const Tooltip = ({
  name,
  state,
  setTooltipRef,
  ...tooltipProps
}: TooltipProps) => {
  const className = 'mr-2'
  const symbol = match(state)
    .with('SUCCESS', () => <Checkmark className={className} />)
    .with('FAILURE', 'ERROR', () => <Cross className={className} />)
    .with('PENDING', () => (
      <StateCircleIcon className={className} state="PENDING" pulse={false} />
    ))
    .otherwise(() => <StateCircleIcon className={className} state="UNKNOWN" />)
  return (
    <div
      {...tooltipProps}
      ref={setTooltipRef}
      className="bg-white rounded px-2 py-1 drop-shadow-sm text-gray-700 border border-gray-200 flex items-center"
    >
      {symbol}
      <span>{name}</span>
    </div>
  )
}

export function StateCircle({ state, detailsUrl, buildName }: any) {
  const { getTooltipProps, setTooltipRef, setTriggerRef, visible } =
    usePopperTooltip(undefined, {
      modifiers: [
        { name: 'offset', options: { offset: [0, 6] } },
        { name: 'preventOverflow', options: { padding: 10 } }
      ]
    })

  return (
    <div className="mr-1 last:mr-0">
      <div ref={setTriggerRef} className="flex">
        {detailsUrl ? (
          <a href={detailsUrl} target="_blank">
            <StateCircleIcon state={state} />
          </a>
        ) : (
          <StateCircleIcon state={state} />
        )}
      </div>
      {visible && (
        <Tooltip
          {...getTooltipProps()}
          setTooltipRef={setTooltipRef}
          name={buildName}
          state={state}
        />
      )}
    </div>
  )
}

const checkRunToBuildState = ({ status, conclusion }: CheckRun): State =>
  match([status, conclusion])
    .with([not('COMPLETED'), __], () => 'PENDING' as const)
    .with(['COMPLETED', 'SUCCESS'], () => 'SUCCESS' as const)
    .with(
      ['COMPLETED', 'FAILURE'],
      ['COMPLETED', 'STARTUP_FAILURE'],
      () => 'FAILURE' as const
    )
    .otherwise(() => 'UNKNOWN' as const)

export function CheckRunStateCircle(checkRun: CheckRun) {
  const { name, detailsUrl } = checkRun
  return (
    <StateCircle
      state={checkRunToBuildState(checkRun)}
      detailsUrl={detailsUrl}
      buildName={name}
    />
  )
}

export function StatusContextStateCircle({
  context,
  targetUrl,
  state
}: StatusContext) {
  return (
    <StateCircle state={state} detailsUrl={targetUrl} buildName={context} />
  )
}
