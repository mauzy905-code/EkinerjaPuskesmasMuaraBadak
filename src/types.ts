export type Role = 'admin' | 'pegawai'

export type PlanStatus = 'Kosong' | 'Selesai'
export type RealizationStatus = 'Kosong' | 'Tidak Lengkap' | 'Selesai'
export type EvidenceStatus = 'Kosong' | 'Belum Lengkap' | 'Selesai'

export type EvidenceFile = {
  id: string
  originalName: string
  fileName: string
  urlPath: string
  storagePath?: string
  mimeType: string
  size: number
  uploadedAt: string
}

export type Employee = {
  id: string
  name: string
  plan_status: PlanStatus
  realization_status: RealizationStatus
  evidence_status: EvidenceStatus
  realization_link: string | null
  keterangan: string | null
  evidence_files: EvidenceFile[]
  created_at: string
  updated_at: string
}

export type Session = {
  token: string
  role: Role
  username: string
}

