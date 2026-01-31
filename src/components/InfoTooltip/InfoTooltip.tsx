import {
  flip,
  offset,
  shift,
  useFloating,
  useFocus,
  useHover,
  useInteractions
} from '@floating-ui/react'
import { type JSX, type ReactNode, useState } from 'react'
import { InfoIcon } from '@/components/icons'
import styles from './InfoTooltip.module.css'

interface InfoTooltipProps {
  title?: string
  children: ReactNode
}

export function InfoTooltip({
  title,
  children
}: InfoTooltipProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })]
  })

  const hover = useHover(context, { move: false })
  const focus = useFocus(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus
  ])

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        className={styles.trigger}
        aria-label={title}
        {...getReferenceProps()}
      >
        <InfoIcon />
      </button>
      {isOpen && (
        <div
          ref={refs.setFloating}
          className={styles.tooltip}
          style={floatingStyles}
          role="tooltip"
          {...getFloatingProps()}
        >
          <span className={styles.title}>{title}</span>
          {children}
        </div>
      )}
    </>
  )
}
