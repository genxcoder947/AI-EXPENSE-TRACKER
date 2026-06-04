import * as React from "react"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className || ''}`}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-emerald-500 transition-all duration-300"
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }}
      />
    </div>
  )
)
Progress.displayName = "Progress"

export { Progress }
