"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Made Autocomplete generic with type T
interface AutocompleteProps<T> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'> {
  suggestions: T[];
  value: string;
  onValueChange: (value: string) => void;
  onSelect?: (item: T) => void;
  label?: string;
  id?: string;
  className?: string;
  // New props to define how to map T to display/select
  getId: (item: T) => number | string;
  getName: (item: T) => string;
  getItemCode?: (item: T) => string | null | undefined;
}

// Explicitly define the generic type for the functional component inside forwardRef
const AutocompleteInner = React.forwardRef(
  <T,>( // Generic type T
    { suggestions, value, onValueChange, onSelect, placeholder, label, id, className, getId, getName, getItemCode, ...props }: AutocompleteProps<T>,
    ref: React.Ref<HTMLInputElement>
  ) => {
    const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const activeItemRef = React.useRef<HTMLButtonElement>(null);

    const filteredSuggestions = React.useMemo(() => {
      if (!value) {
        return [];
      }
      const lowercasedValue = value.toLowerCase();
      return suggestions.filter((item: T) => 
        getName(item).toLowerCase().includes(lowercasedValue) ||
        (getItemCode && getItemCode(item) && getItemCode(item)!.toLowerCase().includes(lowercasedValue))
      ).slice(0, 7);
    }, [suggestions, value, getName, getItemCode]);

    // The popover should be open if there are filtered suggestions AND the user is interacting with the input/popover
    const shouldOpenPopover = isSuggestionsOpen && filteredSuggestions.length > 0;

    React.useEffect(() => {
      setActiveIndex(-1);
    }, [value]);

    React.useEffect(() => {
      if (activeIndex >= 0 && activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: "nearest" });
      }
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!shouldOpenPopover) return; // Use the new state

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (activeIndex >= 0) {
          e.preventDefault();
          const selectedItem = filteredSuggestions[activeIndex];
          onValueChange(getName(selectedItem));
          onSelect?.(selectedItem);
          setIsSuggestionsOpen(false); // Close on select
        } else if (filteredSuggestions.length === 1 && e.key === "Enter") {
          e.preventDefault();
          const selectedItem = filteredSuggestions[0];
          onValueChange(getName(selectedItem));
          onSelect?.(selectedItem);
          setIsSuggestionsOpen(false); // Close on select
        } else {
          setIsSuggestionsOpen(false); // Close if no selection
        }
      } else if (e.key === "Escape") {
        setIsSuggestionsOpen(false);
      }
    };

    return (
      <Popover open={shouldOpenPopover} onOpenChange={setIsSuggestionsOpen}> {/* Control Popover open state */}
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={ref}
              id={id}
              value={value}
              onChange={(e) => {
                onValueChange(e.target.value);
                if (e.target.value.length > 0) { // Open suggestions if typing
                  setIsSuggestionsOpen(true);
                } else {
                  setIsSuggestionsOpen(false); // Close if input is empty
                }
              }}
              onFocus={() => setIsSuggestionsOpen(true)} // Open on focus
              onKeyDown={handleKeyDown}
              placeholder={label ? " " : placeholder}
              autoComplete="off"
              className={cn("peer h-10", label ? "pt-4" : "", className)}
              {...props}
            />
            {label && id && (
              <Label
                htmlFor={id}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-200 ease-in-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:scale-75 peer-focus:bg-background peer-focus:px-1 peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:not(:placeholder-shown))]:-translate-y-1/2 peer-[:not(:not(:placeholder-shown))]:scale-75 peer-[:not(:not(:placeholder-shown))]:bg-background peer-[:not(:not(:placeholder-shown))]:px-1 peer-[:not(:not(:placeholder-shown))]:text-primary"
              >
                {label}
              </Label>
            )}
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="p-1 w-[--radix-popover-anchor-width] z-[100]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          sideOffset={2}
        >
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {filteredSuggestions.map((item: T, index: number) => (
              <button
                key={getId(item)}
                ref={index === activeIndex ? activeItemRef : null}
                type="button"
                className={cn(
                  "w-full text-left rounded-sm p-2 text-sm hover:bg-accent focus:outline-none focus:bg-accent",
                  index === activeIndex && "bg-accent text-accent-foreground"
                )}
                onClick={() => {
                  onValueChange(getName(item));
                  onSelect?.(item);
                  setIsSuggestionsOpen(false); // Close on click
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {getName(item)} {getItemCode && getItemCode(item) && <span className="text-muted-foreground text-xs">({getItemCode(item)})</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
);

// Cast the result to ensure TypeScript understands it's a generic component
export const Autocomplete = AutocompleteInner as typeof AutocompleteInner & {
  <T>(props: AutocompleteProps<T> & { ref?: React.Ref<HTMLInputElement> }): React.ReactElement | null;
};

Autocomplete.displayName = "Autocomplete"