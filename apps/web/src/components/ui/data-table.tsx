import * as React from 'react'
import {
  type ColumnDef,
  type FilterFn,
  type OnChangeFn,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDownIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { cn } from '../../lib/utils'
import { Input } from './input'

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchPlaceholder?: string
  searchValue?: string
  onSearchValueChange?: (value: string) => void
  hideSearch?: boolean
  emptyMessage?: string
  className?: string
  getRowId?: (originalRow: TData, index: number, parent?: unknown) => string
}

const paginationButtonClassName =
  "border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

function SortableHeader({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 [&_svg:not([class*='size-'])]:size-4", className)}>
      {label}
      <ArrowUpDownIcon aria-hidden="true" />
    </span>
  )
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = 'Filter results...',
  searchValue,
  onSearchValueChange,
  hideSearch = false,
  emptyMessage = 'No results.',
  className,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState('')
  const globalFilter = searchValue ?? internalGlobalFilter

  const setGlobalFilter: OnChangeFn<string> = (updater) => {
    const nextValue = typeof updater === 'function' ? updater(globalFilter) : updater
    if (onSearchValueChange) onSearchValueChange(nextValue)
    else setInternalGlobalFilter(nextValue)
  }

  const globalContainsFilter: FilterFn<TData> = (row, _columnId, filterValue) => {
    const needle = String(filterValue ?? '').trim().toLowerCase()
    if (!needle) return true
    return JSON.stringify(row.original).toLowerCase().includes(needle)
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    globalFilterFn: globalContainsFilter,
    getRowId,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className={cn('w-full', className)}>
      {!hideSearch && (
        <div className="flex items-center gap-2 py-4">
          <Input
            aria-label="Filter table"
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder={searchPlaceholder}
            className="max-w-sm"
          />
        </div>
      )}

      <div className="w-full overflow-x-auto rounded-md border bg-white">
        <table className="w-full min-w-max caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap"
                    style={{ width: header.getSize() === 150 ? undefined : header.getSize() }}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="focus-visible:border-ring focus-visible:ring-ring/50 flex w-full items-center gap-2 rounded-md text-left text-sm font-medium outline-none hover:text-accent-foreground focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-2 align-middle whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
                <td className="h-24 p-2 text-center align-middle" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-4 py-4">
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <span>
            Showing {table.getFilteredRowModel().rows.length} out of {data.length}
          </span>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={paginationButtonClassName} onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            <ChevronLeftIcon aria-hidden="true" /> Previous
          </button>
          <button type="button" className={paginationButtonClassName} onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next <ChevronRightIcon aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { DataTable, SortableHeader }
