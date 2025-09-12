"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";

interface FloatingLabelSelectProps extends SelectPrimitive.SelectProps {
  label: string;
  id: string; // Added id prop
  children: React.ReactNode;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

const FloatingLabelSelect = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  FloatingLabelSelectProps
>(
  ({ className, children, label, id, placeholder, value, onValueChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!value);

    React.useEffect(() => {
      setHasValue(!!value);
    }, [value]);

    const handleOpenChange = (open: boolean) => {
      setIsFocused(open);
    };

    return (
      <Select value={value} onValueChange={onValueChange} onOpenChange={handleOpenChange} {...props}>
        <div className="relative">
          <Label
            htmlFor={id}
            className={cn(
              "absolute left-3 transition-all duration-200 ease-in-out pointer-events-none z-10",
              (isFocused || hasValue)
                ? "top-0 -translate-y-1/2 scale-75 bg-background px-1 text-primary"
                : "top-1/2 -translate-y-1/2 text-base text-muted-foreground"
            )}
          >
            {label}
          </Label>
          <SelectTrigger
            ref={ref}
            id={id} // Pass id to SelectTrigger
            className={cn(
              "w-full justify-between h-10",
              (isFocused || hasValue) ? "pt-4" : "",
              className
            )}
          >
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
        </div>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }
);
FloatingLabelSelect.displayName = "FloatingLabelSelect";

export { FloatingLabelSelect };