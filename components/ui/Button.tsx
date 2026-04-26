import { forwardRef, ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "danger" | "ghost"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80",
  secondary:
    "bg-surface-elevated text-foreground hover:bg-surface-hover border border-border-strong",
  danger:
    "bg-danger text-danger-foreground hover:opacity-90 active:opacity-80",
  ghost: "bg-transparent text-foreground hover:bg-white/5",
}

const variantStyle: Record<Variant, React.CSSProperties> = {
  primary: {
    boxShadow: "0 0 0 1px rgba(99, 102, 241, 0.35), 0 4px 16px rgba(99, 102, 241, 0.20), inset 0 1px 0 rgba(255, 255, 255, 0.12)",
  },
  secondary: {},
  danger: {
    boxShadow: "0 4px 14px rgba(255, 93, 108, 0.3)",
  },
  ghost: {},
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-12 px-6 text-base font-semibold",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      children,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-xl font-sans font-medium",
          "transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/50 disabled:opacity-40 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        style={{ ...variantStyle[variant], ...style }}
        {...props}
      >
        {loading ? (
          <span
            className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        ) : null}
        {children}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
