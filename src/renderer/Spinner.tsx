import * as React from 'react'
import { SpinnerCircular } from 'spinners-react'

type Props = {
  size: number
  thickness?: number
  className?: string
}

const Spinner = ({ size, thickness = 200, className }: Props) => (
  <SpinnerCircular
    className={className}
    style={{ display: 'inline-block', color: '#60A5FA' }}
    size={size}
    thickness={thickness}
    secondaryColor="rgba(0,0,0,0.2)"
  />
)

export default Spinner
