import React, { useReducer } from 'react'
import { match, select } from 'ts-pattern'
import { MessageData } from '../main/api'
import useMessages from '../main/hooks/useMessages'
import Spinner from './Spinner'

type PullRequestBranchStatusProps = {
  isUpToDateWithBase: boolean
  baseRefName: string
  headRefName: string
  rebaseFailed: boolean
}

const RemoteBranchUpToDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <span>
    Remote branch is <span className="text-green-700">up-to-date</span> with{' '}
    {baseRefName}
  </span>
)

const RemoteBranchOutOfDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <span>
    Remote branch is <span className="text-red-800">out-of-date</span> with{' '}
    {baseRefName}
  </span>
)

const Progress = ({ children }: { children: React.ReactNode }) => (
  <span>
    <Spinner key="spinner" size={14} />
    <span className="ml-[4px]">{children}</span>
  </span>
)

export default function PullRequestBranchStatus(
  props: PullRequestBranchStatusProps
) {
  const { baseRefName, headRefName } = props
  const defaultBranchStatus = match(props)
    .with({ rebaseFailed: true }, () => (
      <span>Rebase failed! Manual rebase required</span>
    ))
    .with({ isUpToDateWithBase: true }, () => (
      <RemoteBranchUpToDate baseRefName={baseRefName} />
    ))
    .with({ isUpToDateWithBase: false }, () => (
      <RemoteBranchOutOfDate baseRefName={baseRefName} />
    ))
    .run()

  const [branchStatus, dispatch] = useReducer<
    (
      prevState: JSX.Element | 'DEFAULT',
      message: MessageData
    ) => JSX.Element | 'DEFAULT'
  >((prevState, message) => {
    const def = () => 'DEFAULT' as const
    return match(message)
      .with(
        { type: 'REBASE', branch: headRefName, status: select() },
        (status) =>
          match(status)
            .with('GIT_FETCH', () => <>Fetching the remote...</>)
            .with('REBASE', () => <>Rebasing on {baseRefName}...</>)
            .with('GIT_PUSH', () => <>Pushing, with force...</>)
            .with('COMPLETE', def)
            .otherwise(def)
      )
      .with({ type: 'FETCH_PULL_REQUESTS', status: select() }, (status) =>
        match(status)
          .with('START', () => <>Updating...</>)
          .with('COMPLETE', def)
          .otherwise(def)
      )
      .otherwise(def)
  }, 'DEFAULT' as const)

  useMessages(dispatch)

  return (
    <div className="text-gray-600 mt-1">
      <span className="font-semibold">Status: </span>
      {branchStatus === 'DEFAULT' ? (
        defaultBranchStatus
      ) : (
        <Progress>{branchStatus}</Progress>
      )}
    </div>
  )
}
