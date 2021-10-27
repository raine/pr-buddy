import React, { useReducer } from 'react'
import { animated, config, useSpring } from 'react-spring'
import { match, select } from 'ts-pattern'
import { MessageData } from '../main/api'
import useMessages from './hooks/useMessages'
import Spinner from './Spinner'

type TitleBarProps = {
  remoteRepoPath?: string
}

type TitleBarState = {
  fetchingPullRequests: boolean
}

function TitleBar({ remoteRepoPath }: TitleBarProps) {
  const [state, dispatch] = useReducer<
    (prevState: TitleBarState, message: MessageData) => TitleBarState
  >(
    (prevState, message) =>
      match(message)
        .with(
          { type: 'FETCHING_PULL_REQUESTS', status: select() },
          (status) => ({ fetchingPullRequests: status === 'START' })
        )
        .otherwise(() => prevState),
    { fetchingPullRequests: false }
  )

  useMessages(dispatch)

  const rightFadeStyle = useSpring({
    config: { ...config.stiff },
    from: { opacity: 0 },
    to: {
      opacity: state.fetchingPullRequests ? 1 : 0
    }
  })

  const left = remoteRepoPath ? (
    <div className="text-gray-600 font-semibold">{remoteRepoPath}</div>
  ) : null

  const right = (
    <animated.div className="text-gray-600" style={rightFadeStyle}>
      <Spinner key="spinner" size={12} thickness={250} className="mb-[1px]" />
      <span className="ml-1">Fetching pull requests...</span>
    </animated.div>
  )

  return (
    <div className="drag bg-gray-50 flex flex-row shadow-xs sticky top-0">
      <div className="bg-gray-100 border-r w-[74px]"></div>
      <div className="text-sm py-2 pl-3 pr-5 flex justify-between flex-grow text-shadow-sm-fff">
        {left}
        {right}
      </div>
    </div>
  )
}

export default React.memo(TitleBar)
