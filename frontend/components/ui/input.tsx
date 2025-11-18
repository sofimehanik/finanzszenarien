import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-finsim-borderLight dark:border-finsim-dark-borderLight bg-finsim-surface dark:bg-finsim-dark-surface text-finsim-textMain dark:text-finsim-dark-textMain px-3 py-2 text-sm ring-offset-white dark:ring-offset-finsim-dark-surface file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-finsim-textMuted dark:placeholder:text-finsim-dark-textMuted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finsim-primary dark:focus-visible:ring-finsim-dark-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

