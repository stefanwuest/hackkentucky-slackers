import { CoverageCombobox } from '../../components/ui/coverage-combobox'
import { Input } from '../../components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { coverageFilterOptions, daysOperatorLabels, stateOptions } from './constants'
import { type DaysOperator } from './types'

type SharedProspectingFiltersProps = {
  state: string
  coverageTypes: string[]
  onStateChange: (value: string) => void
  onCoverageTypesChange: (value: string[]) => void
}

export function SharedProspectingFilters({
  state,
  coverageTypes,
  onStateChange,
  onCoverageTypesChange,
}: SharedProspectingFiltersProps) {
  return (
    <>
      <label className="filter-field filter-field-state">
        State
        <Select value={state} onValueChange={onStateChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            {stateOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value} — {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <label className="filter-field filter-field-coverage">
        Coverage
        <CoverageCombobox options={coverageFilterOptions} value={coverageTypes} onValueChange={onCoverageTypesChange} />
      </label>
    </>
  )
}

type RenewalFilterFieldsProps = {
  daysOperator: DaysOperator
  daysToRenewal: string
  onDaysOperatorChange: (value: DaysOperator) => void
  onDaysToRenewalChange: (value: string) => void
}

export function RenewalFilterFields({
  daysOperator,
  daysToRenewal,
  onDaysOperatorChange,
  onDaysToRenewalChange,
}: RenewalFilterFieldsProps) {
  return (
    <>
      <label className="filter-field">
        Days operator
        <Select value={daysOperator} onValueChange={(value) => onDaysOperatorChange(value as DaysOperator)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(daysOperatorLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="filter-field">
        Days
        <Input
          type="number"
          min="0"
          max="365"
          value={daysToRenewal}
          onChange={(event) => onDaysToRenewalChange(event.target.value)}
        />
      </label>
    </>
  )
}

type ScatteredContractFilterFieldsProps = {
  carrierCount: string
  contractCount: string
  endMonthCount: string
  onCarrierCountChange: (value: string) => void
  onContractCountChange: (value: string) => void
  onEndMonthCountChange: (value: string) => void
}

export function ScatteredContractFilterFields({
  carrierCount,
  contractCount,
  endMonthCount,
  onCarrierCountChange,
  onContractCountChange,
  onEndMonthCountChange,
}: ScatteredContractFilterFieldsProps) {
  return (
    <>
      <label className="filter-field">
        Min carriers
        <Input type="number" min="1" value={carrierCount} onChange={(event) => onCarrierCountChange(event.target.value)} />
      </label>
      <label className="filter-field">
        Min contracts
        <Input
          type="number"
          min="1"
          value={contractCount}
          placeholder="Any"
          onChange={(event) => onContractCountChange(event.target.value)}
        />
      </label>
      <label className="filter-field">
        Min end months
        <Input
          type="number"
          min="1"
          value={endMonthCount}
          placeholder="Any"
          onChange={(event) => onEndMonthCountChange(event.target.value)}
        />
      </label>
    </>
  )
}

type SubmitButtonProps = {
  isLoading: boolean
}

export function SubmitButton({ isLoading }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      className="bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
      disabled={isLoading}
    >
      {isLoading ? 'Loading…' : 'Apply filters'}
    </button>
  )
}
