"use client"

import { Button } from "@/components/ui/Button"

interface StartShiftButtonProps {
  active: boolean
  onStart: () => void
  onStop: () => void
  loading?: boolean
}

export function StartShiftButton({
  active,
  onStart,
  onStop,
  loading = false,
}: StartShiftButtonProps) {
  if (active) {
    return (
      <Button
        variant="danger"
        size="lg"
        onClick={onStop}
        loading={loading}
        className="w-full"
      >
        Finalizar turno
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={onStart}
      loading={loading}
      className="w-full"
    >
      Empezar turno
    </Button>
  )
}
