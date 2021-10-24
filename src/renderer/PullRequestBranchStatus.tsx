import React, { useReducer } from 'react'
import { match, select } from 'ts-pattern'
import { MessageData } from '../main/api'
import useMessages from './hooks/useMessages'
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
    Branch is <span className="text-green-700">up-to-date</span> with{' '}
    {baseRefName}
  </span>
)

const RemoteBranchOutOfDate = ({
  baseRefName
}: Pick<PullRequestBranchStatusProps, 'baseRefName'>) => (
  <span>
    Branch is <span className="text-red-800">out-of-date</span> with{' '}
    {baseRefName}
  </span>
)

const Progress = ({ children }: { children: React.ReactNode }) => (
  <span>
    <Spinner key="spinner" size={14} />
    <span className="ml-[4px]">{children}</span>
  </span>
)

function PullRequestBranchStatus(props: PullRequestBranchStatusProps) {
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
    .otherwise(() => null)

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
      .with({ type: 'FETCH_PULL_REQUESTS', status: select() }, (status) =>
        match(status)
          .with('START', () => <>Updating...</>)
          .with('COMPLETE', def)
          .otherwise(def)
      )
      .otherwise(() => prevState)
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

export default React.memo(PullRequestBranchStatus)
