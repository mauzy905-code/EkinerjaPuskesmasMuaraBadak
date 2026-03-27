import { createClient } from '@supabase/supabase-js'
import type { Employee, Session } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

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
  return data as Employee[]
}

export async function fetchEmployeesPublic(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
    
  if (error) throw error
  return data as Employee[]
}

export async function createEmployee(name: string): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert([{ name }])
    .select()
    .single()
    
  if (error) throw error
  return data as Employee
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
  return data as Employee
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id)
    
  if (error) throw error
}

export async function uploadEvidence(id: string, file: File): Promise<Employee> {
  // 1. Dapatkan employee saat ini untuk append file info
  const { data: current, error: fetchErr } = await supabase
    .from('employees')
    .select('evidence_files, evidence_status')
    .eq('id', id)
    .single()
    
  if (fetchErr) throw fetchErr
  
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
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString()
  }
  
  const files = Array.isArray(current.evidence_files) ? current.evidence_files : []
  files.unshift(newFile)
  
  let newStatus = current.evidence_status
  if (newStatus === 'Belum') newStatus = 'Belum Lengkap'
  
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
  return updated as Employee
}

