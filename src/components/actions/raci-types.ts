export interface RACIMember {
  id: string
  full_name: string | null
}

export interface RACIValue {
  responsible_id: string | null
  accountable_id: string | null
  consulted_ids: string[]
  informed_ids: string[]
}

export const RACI_DEFAULT: RACIValue = {
  responsible_id: null,
  accountable_id: null,
  consulted_ids: [],
  informed_ids: [],
}
