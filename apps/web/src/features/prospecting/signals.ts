export type ProspectSignalCategoryId = 'renewal_timing'

export type ProspectSignalDefinition = {
  id: string
  categoryId: ProspectSignalCategoryId
  label: string
  description: string
  companyApiQuery: Record<string, string>
}

export type ProspectSignalGroup = {
  id: ProspectSignalCategoryId
  label: string
  description: string
  signals: readonly ProspectSignalDefinition[]
}

export const prospectSignalGroups = [
  {
    id: 'renewal_timing',
    label: 'Renewal timing',
    description: 'Select one or more renewal windows. Companies may match any selected renewal window.',
    signals: [
      {
        id: 'renewal_150_180',
        categoryId: 'renewal_timing',
        label: 'Renewal 150–180 days',
        description: 'Companies with a likely renewal 150 to 180 days out.',
        companyApiQuery: {
          days_to_renewal_gte: '150',
          days_to_renewal_lte: '180',
        },
      },
      {
        id: 'renewal_120_150',
        categoryId: 'renewal_timing',
        label: 'Renewal 120–150 days',
        description: 'Companies with a likely renewal 120 to 150 days out.',
        companyApiQuery: {
          days_to_renewal_gte: '120',
          days_to_renewal_lte: '150',
        },
      },
      {
        id: 'renewal_lte_90',
        categoryId: 'renewal_timing',
        label: 'Renewal <= 90 days',
        description: 'Companies with a likely renewal in the next 90 days.',
        companyApiQuery: {
          days_to_renewal_lte: '90',
        },
      },
    ],
  },
] as const satisfies readonly ProspectSignalGroup[]

export const prospectSignalDefinitions = prospectSignalGroups.flatMap((group) => group.signals)

export type ProspectSignalId = (typeof prospectSignalDefinitions)[number]['id']

export const defaultSelectedProspectSignalIds: ProspectSignalId[] = ['renewal_lte_90']

export const prospectSignalDefinitionById = Object.fromEntries(
  prospectSignalDefinitions.map((signal) => [signal.id, signal]),
) as unknown as Record<ProspectSignalId, ProspectSignalDefinition>

export function toProspectSignalIds(values: string[]) {
  return values.filter((value): value is ProspectSignalId => value in prospectSignalDefinitionById)
}

export function sortProspectSignalIdsByRegistry(signalIds: Iterable<ProspectSignalId>) {
  const selectedSignalIds = new Set(signalIds)
  return prospectSignalDefinitions.filter((signal) => selectedSignalIds.has(signal.id)).map((signal) => signal.id)
}
