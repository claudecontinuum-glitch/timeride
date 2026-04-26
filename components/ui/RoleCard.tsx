import { ReactNode } from "react"
import { Check } from "lucide-react"

interface RoleCardProps {
  title: string
  description: string
  icon: ReactNode
  selected: boolean
  onClick: () => void
}

export function RoleCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "w-full rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-primary/60 bg-primary-soft"
          : "border-border bg-surface hover:bg-surface-hover hover:border-border-strong",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            selected
              ? "bg-primary/20 text-primary"
              : "bg-surface-elevated text-muted-foreground",
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-sans font-semibold text-foreground leading-tight">
            {title}
          </p>
          <p className="mt-1 text-sm font-sans text-muted-foreground leading-snug">
            {description}
          </p>
        </div>
        {selected && (
          <span className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
            <Check size={12} strokeWidth={3} className="text-primary-foreground" />
          </span>
        )}
      </div>
    </button>
  )
}
