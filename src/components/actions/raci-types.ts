export interface RACIMember {
  id: string
  full_name: string | null
}

export interface RACIValue {
  responsible_ids: string[]
  accountable_ids: string[]
  consulted_ids: string[]
  informed_ids: string[]
}

export const RACI_DEFAULT: RACIValue = {
  responsible_ids: [],
  accountable_ids: [],
  consulted_ids: [],
  informed_ids: [],
}
