import { Placement } from '@popperjs/core'
import React, { ReactElement, useEffect, useState } from 'react'
import { usePopper } from 'react-popper'
import { animated, config, useSpring } from 'react-spring'

interface TooltipProps {
  init?: boolean
  springConfig?: {
    from: { [key: string]: any }
    to: { [key: string]: any }
  }
  closeOnClickOutside?: boolean
  content: string | ReactElement
  children: ({
    setReferenceElement
  }: {
    setReferenceElement: React.Dispatch<
      React.SetStateAction<HTMLElement | null>
    >
  }) => React.ReactNode
  trigger: 'click' | 'hover'
  placement: Placement
}

interface TriggerEvents {
  click: { onClick: () => void }
  hover: { onMouseEnter: () => void; onMouseLeave: () => void }
}

const Tooltip: React.FC<TooltipProps> = ({
  init = false,
  springConfig = {
    from: { opacity: 0, config: config.stiff },
    to: { opacity: 1, config: config.stiff }
  },
  content,
  children,
  trigger,
  placement,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(init)
  const triggerEvents: TriggerEvents = {
    click: {
      onClick: () => setIsOpen((prev) => !prev)
    },
    hover: {
      onMouseEnter: () => setIsOpen(true),
      onMouseLeave: () => setIsOpen(false)
    }
  }
  const [referenceElement, setReferenceElement] = useState<HTMLElement | null>(
    null
  )
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  )

  const { styles, attributes, update } = usePopper(
    referenceElement,
    popperElement,
    {
      placement,
      modifiers: [
        { name: 'offset', options: { offset: [0, 6] } },
        { name: 'preventOverflow', options: { padding: 10 } }
      ]
    }
  )
  const springProps = useSpring(isOpen ? springConfig.to : springConfig.from)

  useEffect(() => {
    if (popperElement == null || update == null) return

    const observer = new MutationObserver(() => update())
    observer.observe(popperElement, {
      attributes: true,
      childList: true,
      subtree: true
    })

    return () => observer.disconnect()
  }, [popperElement, update])

  return (
    <>
      {children({
        setReferenceElement,
        ...triggerEvents[trigger]
      })}
      <animated.div
        {...props}
        ref={setPopperElement}
        style={{ ...styles.popper, ...springProps }}
        // This element is left in DOM when hidden, and can block hover event
        // of reference element if it's on top of it after reference element
        // moves
        className="pointer-events-none"
        {...attributes.popper}
      >
        <div className="bg-white p-1 shadow rounded text-gray-700 text-sm">
          {content}
        </div>
      </animated.div>
    </>
  )
}

export default Tooltip
