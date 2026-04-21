import { ReactNode } from "react"

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
        "w-full rounded-2xl border-2 p-5 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-surface hover:border-primary/40",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p
            className={[
              "text-base font-semibold",
              selected ? "text-primary" : "text-foreground",
            ].join(" ")}
          >
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {selected && (
          <span className="ml-auto text-primary text-xl" aria-hidden="true">
            ✓
          </span>
        )}
      </div>
    </button>
  )
}
