"use client"

import { Button } from "@/components/ui/Button"

interface RegisterStopButtonProps {
  onRegister: () => void
  loading?: boolean
  disabled?: boolean
}

export function RegisterStopButton({
  onRegister,
  loading = false,
  disabled = false,
}: RegisterStopButtonProps) {
  return (
    <Button
      variant="secondary"
      size="md"
      onClick={onRegister}
      loading={loading}
      disabled={disabled}
      className="w-full"
    >
      Registrar parada aqui
    </Button>
  )
}
