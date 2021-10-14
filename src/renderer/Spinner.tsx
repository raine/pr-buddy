import * as React from 'react'
import { SpinnerCircular } from 'spinners-react'

type Props = {
  size: number
}

const Spinner = ({ size }: Props) => (
  <SpinnerCircular
    style={{ display: 'inline-block', color: '#60A5FA' }}
    size={size}
    thickness={200}
    secondaryColor="rgba(0,0,0,0.2)"
  />
)

export default Spinner
