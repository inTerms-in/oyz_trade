"use client"

import * as React from "react"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface EntityAutocompleteProps<T> extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onSelect'> {
  suggestions: T[];
  value: string; // The current input value (name) from parent
  onValueChange: (value: string) => void; // When the input text changes
  onSelect?: (entity: T) => void; // When an entity is selected from suggestions
  label?: string;
  id: string;
  className?: string;
  // New props to define how to map T to Entity
  getId: (item: T) => number | string;
  getName: (item: T) => string;
  getMobileNo?: (item: T) => string | null | undefined;
}

// Explicitly define the generic type for the functional component inside forwardRef
const EntityAutocompleteInner = React.forwardRef(
  <T,>( // Generic type T
    { suggestions, value, onValueChange, onSelect, placeholder, label, id, className, getId, getName, getMobileNo, ...props }: EntityAutocompleteProps<T>,
    ref: React.Ref<HTMLInputElement>
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const activeItemRef = React.useRef<HTMLButtonElement>(null);
    const [displayValue, setDisplayValue] = React.useState(value); // Internal state for input field

    // Sync internal displayValue with external value prop
    React.useEffect(() => {
      if (value !== displayValue) {
        setDisplayValue(value);
      }
    }, [value]);

    const filteredSuggestions = React.useMemo(() => {
      if (!displayValue) {
        return [];
      }
      const lowercasedValue = displayValue.toLowerCase();
      return suggestions.filter((entity: T) => 
        getName(entity).toLowerCase().includes(lowercasedValue)
      ).slice(0, 7);
    }, [suggestions, displayValue, getName]);

    const open = isFocused && filteredSuggestions.length > 0;

    React.useEffect(() => {
      setActiveIndex(-1);
    }, [displayValue]);

    React.useEffect(() => {
      if (activeIndex >= 0 && activeItemRef.current) {
        activeItemRef.current.scrollIntoView({ block: "nearest" });
      }
    }, [activeIndex]);

    const handleSelect = (selectedEntity: T) => {
      const entityDisplayName = getName(selectedEntity);
      setDisplayValue(entityDisplayName); // Update internal state
      onValueChange(entityDisplayName); // Propagate to parent
      onSelect?.(selectedEntity); // Call parent's onSelect
      setIsFocused(false);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setTimeout(() => {
        setIsFocused(false);
      }, 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredSuggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (activeIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredSuggestions[activeIndex]);
        } else if (filteredSuggestions.length === 1 && e.key === "Enter") {
          e.preventDefault();
          handleSelect(filteredSuggestions[0]);
        } else {
          setIsFocused(false);
        }
      } else if (e.key === "Escape") {
        setIsFocused(false);
      }
    };

    return (
      <Popover open={open}>
        <PopoverAnchor asChild>
          <div className="relative">
            <Input
              ref={ref}
              id={id}
              value={displayValue} // Use internal state
              onChange={(e) => {
                setDisplayValue(e.target.value); // Update internal state
                onValueChange(e.target.value); // Propagate to parent
              }}
              onFocus={handleFocus}
              onBlur={handleBlur}
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
            {filteredSuggestions.map((entity: T, index: number) => (
              <button
                key={getId(entity)}
                ref={index === activeIndex ? activeItemRef : null}
                type="button"
                className={cn(
                  "w-full text-left rounded-sm p-2 text-sm hover:bg-accent focus:outline-none focus:bg-accent",
                  index === activeIndex && "bg-accent text-accent-foreground" // Highlight active item
                )}
                onClick={() => handleSelect(entity)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {getName(entity)} {getMobileNo && getMobileNo(entity) && <span className="text-muted-foreground text-xs">({getMobileNo(entity)})</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }
);

// Cast the result to ensure TypeScript understands it's a generic component
export const EntityAutocomplete = EntityAutocompleteInner as typeof EntityAutocompleteInner & {
  <T>(props: EntityAutocompleteProps<T> & { ref?: React.Ref<HTMLInputElement> }): React.ReactElement | null;
};

EntityAutocomplete.displayName = "EntityAutocomplete";