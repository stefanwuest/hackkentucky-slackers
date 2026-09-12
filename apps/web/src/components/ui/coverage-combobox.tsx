import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { CheckIcon, ChevronsUpDownIcon, SearchIcon, XIcon } from 'lucide-react'

import { cn } from '../../lib/utils'

type ComboboxOption = {
  value: string
  label: string
}

type CoverageComboboxProps = {
  options: ComboboxOption[]
  value: string[]
  onValueChange: (value: string[]) => void
  placeholder?: string
  className?: string
}

function CoverageCombobox({
  options,
  value,
  onValueChange,
  placeholder = 'All coverages',
  className,
}: CoverageComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const selected = new Set(value)
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.value}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const selectedLabel = value.length
    ? value.length <= 2
      ? value.map((selectedValue) => options.find((option) => option.value === selectedValue)?.label ?? selectedValue).join(', ')
      : `${value.length} coverages selected`
    : placeholder

  function toggleValue(nextValue: string) {
    onValueChange(selected.has(nextValue) ? value.filter((item) => item !== nextValue) : [...value, nextValue])
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
            className,
          )}
        >
          <span className={cn('truncate', !value.length && 'text-muted-foreground')}>{selectedLabel}</span>
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          className="bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-[var(--radix-popover-trigger-width)] min-w-[260px] rounded-md border p-0 shadow-md outline-none"
          sideOffset={4}
        >
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="text-muted-foreground size-4" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="placeholder:text-muted-foreground h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="Search coverage..."
            />
            {value.length ? (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground rounded-sm p-1"
                onClick={() => onValueChange([])}
                aria-label="Clear coverage filters"
              >
                <XIcon className="size-4" />
              </button>
            ) : null}
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {filteredOptions.length ? (
              filteredOptions.map((option) => {
                const isSelected = selected.has(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    className="focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden select-none"
                    onClick={() => toggleValue(option.value)}
                  >
                    <span
                      className={cn(
                        'border-primary flex size-4 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </span>
                    <span className="truncate">{option.label}</span>
                  </button>
                )
              })
            ) : (
              <div className="text-muted-foreground px-2 py-6 text-center text-sm">No coverage found.</div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

export { CoverageCombobox }
