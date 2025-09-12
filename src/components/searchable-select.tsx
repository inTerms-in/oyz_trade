"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

export interface SearchableSelectItem {
  value: string;
  label: string;
  mobileNo?: string | null;
}

interface SearchableSelectProps {
  options: SearchableSelectItem[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
  id?: string;
  className?: string;
  // Removed onNewItemRequest prop
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  label,
  id,
  className,
  // Removed onNewItemRequest from destructuring
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const commandInputRef = React.useRef<HTMLInputElement>(null);
  const activeItemRef = React.useRef<HTMLDivElement>(null);

  const selectedOptionLabel = React.useMemo(
    () => options.find((option) => option.value === value)?.label,
    [options, value]
  );

  React.useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  React.useEffect(() => {
    if (activeIndex >= 0 && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  React.useEffect(() => {
    if (open && commandInputRef.current) {
      setTimeout(() => {
        commandInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const handleSelect = (currentValue: string) => {
    const selectedOption = options.find((option) => option.label.toLowerCase() === currentValue.toLowerCase());
    if (selectedOption) {
      onChange(selectedOption.value);
    } else {
      onChange("");
    }
    setOpen(false);
    setSearch("");
  };

  const filteredOptions = React.useMemo(() => {
    if (!search) return options.slice(0, 10);
    const lowercasedSearch = search.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowercasedSearch)
    ).slice(0, 10);
  }, [options, search]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeIndex >= 0) {
        e.preventDefault();
        const selectedValue = filteredOptions[activeIndex].label;
        handleSelect(selectedValue);
      } else if (filteredOptions.length === 1 && e.key === "Enter") {
        e.preventDefault();
        handleSelect(filteredOptions[0].label);
      } else {
        const exactMatch = options.find(opt => opt.label.toLowerCase() === search.toLowerCase());
        if (exactMatch) {
          e.preventDefault();
          handleSelect(exactMatch.label);
        } else {
          setOpen(false);
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10",
            label ? "pt-4" : "",
            !selectedOptionLabel && "text-muted-foreground",
            className
          )}
          id={id}
          onClick={() => {
            setOpen((prev) => !prev);
            setSearch("");
          }}
        >
          <span className="flex items-center justify-between w-full">
            {selectedOptionLabel || placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput
            ref={commandInputRef}
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {/* Removed conditional rendering for "Create new..." */}
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option, index) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.label)}
                  ref={index === activeIndex ? activeItemRef : null}
                  className={cn(
                    "flex items-center",
                    index === activeIndex && "bg-accent text-accent-foreground"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}