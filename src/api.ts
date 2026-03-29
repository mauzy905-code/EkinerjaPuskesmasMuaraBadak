import { createClient } from '@supabase/supabase-js'
import type { Employee, Session } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

function normalizeEmployee(row: any): Employee {
  const plan = row?.plan_status
  const realization = row?.realization_status
  const evidence = row?.evidence_status

  const plan_status = plan === 'Belum' ? 'Kosong' : plan === 'Sudah' ? 'Selesai' : plan
  const realization_status = realization === 'Belum' ? 'Kosong' : realization === 'Sudah' ? 'Selesai' : realization
  const evidence_status =
    evidence === 'Belum' ? 'Kosong' : evidence === 'Sudah Lengkap' ? 'Selesai' : evidence

  return {
    ...row,
    plan_status,
    realization_status,
    evidence_status,
    realization_link: row?.realization_link ?? null,
    keterangan: row?.keterangan ?? null,
    evidence_files: Array.isArray(row?.evidence_files) ? row.evidence_files : []
  } as Employee
}

export async function login(username: string, password: string): Promise<Session> {
  // Dalam skenario ini, kita anggap semua login menggunakan email di Supabase Auth
  // Jadi 'admin' diubah menjadi 'admin@example.com' misalnya, saat daftar di dashboard
  const email = username.includes('@') ? username : `${username}@example.com`
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  if (!data.session) throw new Error('No session returned')
    
  return {
    token: data.session.access_token,
    role: 'admin', // Kita hardcode role admin untuk yang bisa login, public read-only tanpa login
    username: username
  }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}

export async function fetchEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return (data || []).map(normalizeEmployee)
}

export async function fetchEmployeesPublic(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return (data || []).map(normalizeEmployee)
}

export async function createEmployee(name: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert([
      {
        name,
        plan_status: 'Kosong',
        realization_status: 'Kosong',
        evidence_status: 'Kosong',
        realization_link: null,
        keterangan: null,
        evidence_files: []
      }
    ])
    .select()
    .single()
    
  if (error) throw error
  return normalizeEmployee(data)
}

export async function updateEmployee(id: string, patch: Partial<Employee>): Promise<Employee> {
  // Hanya ambil field yang perlu diupdate, pastikan key sesuai snake_case
  const updateData = { ...patch, updated_at: new Date().toISOString() }
  
  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()
    
  if (error) throw error
  return normalizeEmployee(data)
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
    
  if (error) throw error
}

export async function uploadEvidence(
  id: string,
  file: File,
  options?: { mode?: 'replace' | 'append' }
): Promise<Employee> {
  const mode = options?.mode ?? 'replace'

  // 1. Dapatkan employee saat ini untuk append file info
  const { data: current, error: fetchErr } = await supabase
    .from('employees')
    .select('evidence_files, evidence_status')
    .eq('id', id)
    .single()
    
  if (fetchErr) throw fetchErr
  
  if (mode === 'replace') {
    const prevFiles = Array.isArray(current.evidence_files) ? current.evidence_files : []
    const paths = prevFiles.map((f: any) => f?.storagePath).filter((p: any) => typeof p === 'string' && p.length)
    if (paths.length) {
      await supabase.storage
        .from('evidences')
        .remove(paths)
        .catch(() => null)
    }
  }

  // 2. Upload ke Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`
  const filePath = `${id}/${fileName}`
  
  const { error: uploadErr } = await supabase.storage
    .from('evidences')
    .upload(filePath, file)
    
  if (uploadErr) throw uploadErr
  
  // Dapatkan URL public
  const { data: publicUrlData } = supabase.storage
    .from('evidences')
    .getPublicUrl(filePath)
    
  // 3. Update data jsonb di employees
  const newFile = {
    id: crypto.randomUUID(),
    originalName: file.name,
    fileName: fileName,
    urlPath: publicUrlData.publicUrl,
    storagePath: filePath,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString()
  }
  
  const prevFiles = Array.isArray(current.evidence_files) ? current.evidence_files : []
  const files = mode === 'append' ? [newFile, ...prevFiles] : [newFile]
  
  let newStatus = current.evidence_status
  if (newStatus === 'Kosong' || newStatus === 'Belum') newStatus = 'Belum Lengkap'
  if (newStatus === 'Sudah Lengkap') newStatus = 'Selesai'
  
  const { data: updated, error: updateErr } = await supabase
    .from('employees')
    .update({ 
      evidence_files: files,
      evidence_status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
    
  if (updateErr) throw updateErr
  return normalizeEmployee(updated)
}

export async function clearEvidence(id: string): Promise<Employee> {
  const { data: current, error: fetchErr } = await supabase
    .from('employees')
    .select('evidence_files')
    .eq('id', id)
    .single()

  if (fetchErr) throw fetchErr

  const prevFiles = Array.isArray(current.evidence_files) ? current.evidence_files : []
  const paths = prevFiles.map((f: any) => f?.storagePath).filter((p: any) => typeof p === 'string' && p.length)
  if (paths.length) {
    await supabase.storage
      .from('evidences')
      .remove(paths)
      .catch(() => null)
  }

  const { data: updated, error: updateErr } = await supabase
    .from('employees')
    .update({
      evidence_files: [],
      evidence_status: 'Kosong',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateErr) throw updateErr
  return normalizeEmployee(updated)
}
