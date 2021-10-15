import { useEffect } from 'react'
import { MessageListener } from '../../main/api'

export default function useMessages(listener: MessageListener) {
  useEffect(() => {
    const unsub = window.electronAPI.subscribe('message', listener)
    return unsub
  }, [])
}
