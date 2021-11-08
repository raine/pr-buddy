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
  <div className={classNames('inline-block px-2 rounded border', className)}>
    {children}
  </div>
)

const Conflicts = () => (
  <Badge className="text-amber-600 border-orange-200">Conflicts</Badge>
)

const RemoteBranchUpToDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <Badge className="text-green-600 border-green-200">Up to date</Badge>
)

const RemoteBranchOutOfDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <Badge className="text-gray-600 border-gray-200">Out of date</Badge>
)

const Progress = ({ children }: { children: React.ReactNode }) => (
  <span>
    <Spinner key="spinner" size={14} className="mb-[1px]" thickness={250} />
    <span className="ml-[4px]">{children}</span>
  </span>
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
    // Height 21px avoids slight movement in layout when badges change to
    // progress
    <div className="text-gray-600 mt-2 flex h-[21px]">
      <span className="font-semibold mr-2">Status:</span>
      {branchStatus === 'DEFAULT' ? (
        defaultBranchStatus
      ) : (
        <Progress>{branchStatus}</Progress>
      )}
    </div>
  )
}

export default React.memo(PullRequestBranchStatus)
