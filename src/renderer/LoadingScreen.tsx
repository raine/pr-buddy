import React from 'react'
import { animated, useSpring } from 'react-spring'

function LoadingScreen() {
  const fadeStyle = useSpring({
    from: { opacity: 0 },
    to: {
      opacity: 1
    }
  })

  return (
    <div className="flex items-center justify-center h-[90vh] drag">
      <animated.div className="text-3xl text-gray-400" style={fadeStyle}>
        Loading...
      </animated.div>
    </div>
  )
}

export default LoadingScreen
