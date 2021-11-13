import classNames from 'classnames'
import React, { useReducer } from 'react'
import { match } from 'ts-pattern'
import { MessageData } from '../main/api'
import { MergeableStatus } from '../main/github'
import useMessages from './hooks/useMessages'
import Spinner from './Spinner'

type PullRequestBranchStatusProps = {
  isUpToDateWithBase: boolean
  baseRefName: string
  headRefName: string
  rebaseFailed: boolean
  mergeable: MergeableStatus
}

const Badge = ({
  children,
  className
}: {
  children: React.ReactNode
  className: string
}) => (
  <div
    className={classNames(
      'inline-block px-2 rounded bg-white text-sm shadow-sm',
      className
    )}
  >
    {children}
  </div>
)

const Conflicts = () => <Badge className="text-amber-600">Conflicts</Badge>

const RemoteBranchUpToDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <Badge className="text-emerald-600">Up to date</Badge>
)

const RemoteBranchOutOfDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <Badge className="text-gray-600">Out of date</Badge>
)

const Progress = ({ children }: { children: React.ReactNode }) => (
  <div>
    <Spinner key="spinner" size={14} className="mb-[1px]" thickness={250} />
    <span className="ml-[4px]">{children}</span>
  </div>
)

function PullRequestBranchStatus(props: PullRequestBranchStatusProps) {
  const { baseRefName, headRefName } = props
  const defaultBranchStatus = props.rebaseFailed ? (
    <span>Rebase failed! Manual rebase required</span>
  ) : (
    <div className="space-x-1.5">
      {props.isUpToDateWithBase ? (
        <RemoteBranchUpToDate baseRefName={baseRefName} />
      ) : (
        <RemoteBranchOutOfDate baseRefName={baseRefName} />
      )}

      {props.mergeable === 'CONFLICTING' ? <Conflicts /> : null}
    </div>
  )

  const [branchStatus, dispatch] = useReducer<
    (
      prevState: JSX.Element | 'DEFAULT',
      message: MessageData
    ) => JSX.Element | 'DEFAULT'
  >((prevState, message) => {
    const def = () => 'DEFAULT' as const
    return match(message)
      .with({ type: 'REBASE', branch: headRefName }, (message) =>
        match(message)
          .with({ status: 'GIT_FETCH' }, () => <>Fetching the remote...</>)
          .with({ status: 'REBASE' }, () => <>Rebasing on {baseRefName}...</>)
          .with({ status: 'GIT_PUSH' }, () => <>Pushing, with force...</>)
          .with({ status: 'YARN_INSTALL' }, () => (
            <>Auto-resolving conflicts with yarn...</>
          ))
          .with(
            { status: 'REBASE_PROGRESS' },
            ({ info: { currentRebaseStep, totalRebaseSteps } }) => (
              <>
                Rebasing on {baseRefName}...{' '}
                {`(${currentRebaseStep}/${totalRebaseSteps})`}
              </>
            )
          )
          .with({ status: 'COMPLETE' }, def)
          .otherwise(def)
      )
      .otherwise(() => prevState)
  }, 'DEFAULT' as const)

  useMessages(dispatch)

  return (
    // Height 29px avoids slight movement in layout when badges change to
    // progress
    <div className="bg-gray-50 rounded p-2 mt-2 flex flex-row space-x-2 items-center h-[29px]">
      <span className="text-gray-600 font-medium text-sm">Status:</span>
      <div className="text-gray-600 text-sm">
        {branchStatus === 'DEFAULT' ? (
          defaultBranchStatus
        ) : (
          <Progress>{branchStatus}</Progress>
        )}
      </div>
    </div>
  )
}

export default React.memo(PullRequestBranchStatus)
