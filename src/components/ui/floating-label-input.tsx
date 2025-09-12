"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const FloatingLabelInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<"input"> & { label: string }
>(({ className, label, id, ...props }, ref) => {
  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        className={cn("peer h-10 pt-4", className)}
        placeholder=" "
        {...props}
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:bg-background peer-focus:px-1 peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:bg-background peer-[:not(:placeholder-shown)]:px-1 peer-[:not(:placeholder-shown)]:text-primary"
      >
        {label}
      </Label>
    </div>
  )
})
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }