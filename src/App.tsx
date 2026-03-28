import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Employee, EvidenceStatus, PlanStatus, RealizationStatus, Role, Session } from './types'
import {
  createEmployee,
  deleteEmployee,
  fetchEmployeesPublic,
  login,
  logout,
  updateEmployee,
  uploadEvidence,
  supabase
} from './api'

function statusDot(status: PlanStatus | RealizationStatus | EvidenceStatus): 'good' | 'warn' | 'bad' {
  if (status === 'Sudah' || status === 'Sudah Lengkap') return 'good'
  if (status === 'Belum Lengkap') return 'warn'
  return 'bad'
}

function Badge({ label }: { label: string }) {
  return (
    <span className="badge">
      <span className={`dot ${statusDot(label as any)}`} />
      <span>{label}</span>
    </span>
  )
}

type ProgresFilter =
  | 'all'
  | 'all_belum'
  | 'ra_sudah_lr_belum'
  | 'ra_lr_sudah_bukti_belum'
  | 'ra_lr_sudah_bukti_belum_lengkap'
  | 'ra_lr_sudah_bukti_sudah_lengkap'

type Draft = {
  name: string
  plan_status: PlanStatus
  realization_status: RealizationStatus
  evidence_status: EvidenceStatus
  realization_link: string
  keterangan: string
}

function AdminLoginModal({
  open,
  onClose,
  onLoggedIn
}: {
  open: boolean
  onClose: () => void
  onLoggedIn: (session: Session) => void
}) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const session = await login(username.trim(), password)
      if (session.role !== 'admin') {
        setError('Akun ini bukan admin')
        return
      }
      onLoggedIn(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="modalBackdrop"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose()
      }}
    >
      <div className="modalCard">
        <div className="panelHeader">
          <div className="brand">
            <h1>Login Admin</h1>
            <div className="subtitle">Masuk untuk mengubah/update status pegawai</div>
          </div>
          <button className="button" type="button" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <p style={{ marginTop: 0 }}>
            Akun awal: <b>admin/admin</b>
          </p>
          {error ? <div className="error">{error}</div> : null}
          <form onSubmit={submit} style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            <input
              className="input"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <input
              className="input"
              placeholder="Password"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button className="button primary" disabled={busy}>
              {busy ? 'Masuk...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function RoleChip({ role }: { role: Role | 'publik' }) {
  if (role === 'publik') return <span className="badge">Publik</span>
  return <span className="badge">{role === 'admin' ? 'Admin' : 'Pegawai'}</span>
}

function AdminIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5 20 6.5v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11v-6l8-4z"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 12.2l1.9 1.9 3.8-3.8"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProgresFilter>('all')
  const [busy, setBusy] = useState(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({})
  const [newName, setNewName] = useState('')
  const [adminLoginOpen, setAdminLoginOpen] = useState(false)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const isAdmin = session?.role === 'admin'

  function isDirty(emp: Employee, d: Draft | undefined) {
    if (!d) return false
    const link = d.realization_link.trim()
    const empLink = emp.realization_link || ''
    const ket = d.keterangan.trim()
    const empKet = emp.keterangan || ''
    return (
      d.name.trim() !== emp.name ||
      d.plan_status !== emp.plan_status ||
      d.realization_status !== emp.realization_status ||
      d.evidence_status !== emp.evidence_status ||
      link !== empLink ||
      ket !== empKet
    )
  }

  const dirtyCount = useMemo(() => {
    if (!isAdmin) return 0
    let count = 0
    for (const emp of employees) {
      if (isDirty(emp, drafts[emp.id])) count += 1
    }
    return count
  }, [employees, drafts, isAdmin])

  async function saveAll() {
    if (!isAdmin) return
    const idsToSave = employees.filter((e) => isDirty(e, drafts[e.id])).map((e) => e.id)
    if (!idsToSave.length) return
    setError(null)
    setSaveBusy(true)
    try {
      const updatedById: Record<string, Employee> = {}
      for (const id of idsToSave) {
        const emp = employees.find((e) => e.id === id)
        const d = drafts[id]
        if (!emp || !d) continue
        const updated = await updateEmployee(id, {
          name: d.name.trim(),
          plan_status: d.plan_status,
          realization_status: d.realization_status,
          evidence_status: d.evidence_status,
          realization_link: d.realization_link.trim() ? d.realization_link.trim() : null,
          keterangan: d.keterangan.trim() ? d.keterangan.trim() : null
        })
        updatedById[id] = updated
      }
      setEmployees((prev) => prev.map((e) => updatedById[e.id] ?? e))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan')
    } finally {
      setSaveBusy(false)
    }
  }

  async function resetBulanan() {
    if (!isAdmin) return
    const ok = window.confirm('Reset bulanan akan mengubah semua status menjadi "Belum" dan mengosongkan link & bukti. Lanjutkan?')
    if (!ok) return
    setError(null)
    setResetBusy(true)
    try {
      const updatedById: Record<string, Employee> = {}
      for (const emp of employees) {
        const updated = await updateEmployee(emp.id, {
          plan_status: 'Belum',
          realization_status: 'Belum',
          evidence_status: 'Belum',
          realization_link: null,
          keterangan: null,
          evidence_files: []
        })
        updatedById[emp.id] = updated
      }
      setEmployees((prev) => prev.map((e) => updatedById[e.id] ?? e))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal reset bulanan')
    } finally {
      setResetBusy(false)
    }
  }

  async function load() {
    setError(null)
    setBusy(true)
    try {
      const data = await fetchEmployeesPublic()
      setEmployees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    // Cek session Supabase saat load awal
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession({ token: session.access_token, role: 'admin', username: session.user.email || 'admin' })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession({ token: session.access_token, role: 'admin', username: session.user.email || 'admin' })
      } else {
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    load()
    
    // Subscribe ke realtime updates Supabase
    const channel = supabase
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        // Simple strategy: reload semua jika ada perubahan
        load()
      })
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const next: Record<string, Draft> = {}
    for (const emp of employees) {
      next[emp.id] = {
        name: emp.name,
        plan_status: emp.plan_status,
        realization_status: emp.realization_status,
        evidence_status: emp.evidence_status,
        realization_link: emp.realization_link || '',
        keterangan: emp.keterangan || ''
      }
    }
    setDrafts(next)
  }, [employees])

  const fileLabel = useMemo(() => 'Bukti SS', [])

  function EvidenceChip({ url }: { url: string }) {
    return (
      <a className="fileChip" href={url} target="_blank" rel="noreferrer" title={fileLabel}>
        <span className="fileIcon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 3h6l3 3v15H6V3h3z"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M15 3v3h3"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span>{fileLabel}</span>
      </a>
    )
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = q ? employees.filter((e) => e.name.toLowerCase().includes(q)) : employees
    if (filter === 'all') return base
    return base.filter((e) => {
      if (filter === 'all_belum') {
        return e.plan_status === 'Belum' && e.realization_status === 'Belum' && e.evidence_status === 'Belum'
      }
      if (filter === 'ra_sudah_lr_belum') {
        return e.plan_status === 'Sudah' && e.realization_status === 'Belum'
      }
      if (filter === 'ra_lr_sudah_bukti_belum') {
        return e.plan_status === 'Sudah' && e.realization_status === 'Sudah' && e.evidence_status === 'Belum'
      }
      if (filter === 'ra_lr_sudah_bukti_belum_lengkap') {
        return e.plan_status === 'Sudah' && e.realization_status === 'Sudah' && e.evidence_status === 'Belum Lengkap'
      }
      if (filter === 'ra_lr_sudah_bukti_sudah_lengkap') {
        return e.plan_status === 'Sudah' && e.realization_status === 'Sudah' && e.evidence_status === 'Sudah Lengkap'
      }
      return true
    })
  }, [employees, query, filter])

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>Monitoring E-Kinerja Puskesmas Muara Badak</h1>
          <div className="subtitle">
            Hak akses: <RoleChip role={isAdmin ? 'admin' : 'publik'} />
          </div>
        </div>
        <div className="row">
          {isAdmin ? (
            <button
              className="button"
              onClick={async () => {
                try {
                  await logout()
                } catch {
                  await supabase.auth.signOut().catch(() => {})
                } finally {
                  setSession(null)
                }
              }}
            >
              Logout ({session?.username || 'admin'})
            </button>
          ) : (
            <button className="iconButton" type="button" onClick={() => setAdminLoginOpen(true)} title="Admin">
              <AdminIcon />
            </button>
          )}
        </div>
      </div>

      <AdminLoginModal
        open={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onLoggedIn={(s) => {
          setAdminLoginOpen(false)
          setSession(s)
        }}
      />

      <div className="panel">
        <div className="panelHeader">
          <div className="row">
            <input
              className="input"
              placeholder="Cari nama pegawai..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: 260 }}
            />
            <span className="muted">
              Menampilkan {filtered.length} dari {employees.length}
            </span>
          </div>
          <div className="row">
            {session?.role === 'admin' ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  const name = newName.trim()
                  if (!name) return
                  setError(null)
                  setBusy(true)
                  try {
                    const created = await createEmployee(name)
                    setEmployees((prev) => [created, ...prev])
                    setNewName('')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Gagal menambah pegawai')
                  } finally {
                    setBusy(false)
                  }
                }}
                className="row"
              >
                <input
                  className="input"
                  placeholder="Tambah pegawai (nama)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ width: 240 }}
                />
                <button className="button primary" disabled={busy}>
                  Tambah
                </button>
              </form>
            ) : null}
            {isAdmin ? (
              <button
                className="button primary"
                type="button"
                onClick={saveAll}
                disabled={saveBusy || resetBusy || dirtyCount === 0}
              >
                {saveBusy ? 'Menyimpan...' : `Simpan Semua${dirtyCount ? ` (${dirtyCount})` : ''}`}
              </button>
            ) : null}
            {isAdmin ? (
              <button className="button danger" type="button" onClick={resetBulanan} disabled={saveBusy || resetBusy}>
                {resetBusy ? 'Reset...' : 'Reset Bulanan'}
              </button>
            ) : null}
            <button className="button" onClick={load} disabled={busy}>
              {busy ? 'Memuat...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? <div className="error" style={{ margin: 14 }}>{error}</div> : null}

        {!isAdmin ? (
          <div className="panelHeader" style={{ borderBottom: 'none', paddingTop: 10 }}>
            <div className="row">
              <button className={`button pill pill-all ${filter === 'all' ? 'active' : ''}`} type="button" onClick={() => setFilter('all')}>
                Semua
              </button>
              <button
                className={`button pill pill-all_belum ${filter === 'all_belum' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('all_belum')}
              >
                Semua Belum
              </button>
              <button
                className={`button pill pill-ra_sudah_lr_belum ${filter === 'ra_sudah_lr_belum' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('ra_sudah_lr_belum')}
              >
                RA Sudah, LR Belum
              </button>
              <button
                className={`button pill pill-ra_lr_sudah_bukti_belum ${filter === 'ra_lr_sudah_bukti_belum' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('ra_lr_sudah_bukti_belum')}
              >
                Bukti Dukung Belum
              </button>
              <button
                className={`button pill pill-ra_lr_sudah_bukti_belum_lengkap ${filter === 'ra_lr_sudah_bukti_belum_lengkap' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('ra_lr_sudah_bukti_belum_lengkap')}
              >
                Bukti Dukung Belum Lengkap
              </button>
              <button
                className={`button pill pill-ra_lr_sudah_bukti_sudah_lengkap ${filter === 'ra_lr_sudah_bukti_sudah_lengkap' ? 'active' : ''}`}
                type="button"
                onClick={() => setFilter('ra_lr_sudah_bukti_sudah_lengkap')}
              >
                Bukti Dukung Sudah Lengkap
              </button>
            </div>
          </div>
        ) : null}

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 70 }}>Nomor</th>
                <th style={{ minWidth: 220 }}>Nama Pegawai</th>
                <th style={{ minWidth: 160 }}>Rencana Aksi</th>
                <th style={{ minWidth: 220 }}>Link &amp; Realisasi</th>
                <th style={{ minWidth: 260 }}>Bukti Dukung</th>
                {session?.role === 'admin' ? <th style={{ width: 110 }}>Aksi</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => (
                <tr key={emp.id}>
                  <td className="muted">{idx + 1}</td>
                  <td>
                    {session?.role === 'admin' ? (
                      <input
                        className="input"
                        value={drafts[emp.id]?.name ?? emp.name}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [emp.id]: { ...(prev[emp.id] ?? ({} as Draft)), name: e.target.value }
                          }))
                        }
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    )}
                    <div className="muted">Update: {new Date(emp.updated_at).toLocaleString('id-ID')}</div>
                  </td>
                  <td>
                    {session?.role === 'admin' ? (
                      <select
                        className="select"
                        value={drafts[emp.id]?.plan_status ?? emp.plan_status}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [emp.id]: { ...(prev[emp.id] ?? ({} as Draft)), plan_status: e.target.value as PlanStatus }
                          }))
                        }
                      >
                        <option value="Belum">Belum</option>
                        <option value="Sudah">Sudah</option>
                      </select>
                    ) : (
                      <Badge label={emp.plan_status} />
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {session?.role === 'admin' ? (
                        <select
                          className="select"
                          value={drafts[emp.id]?.realization_status ?? emp.realization_status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [emp.id]: {
                                ...(prev[emp.id] ?? ({} as Draft)),
                                realization_status: e.target.value as RealizationStatus
                              }
                            }))
                          }
                        >
                          <option value="Belum">Belum</option>
                          <option value="Sudah">Sudah</option>
                        </select>
                      ) : (
                        <Badge label={emp.realization_status} />
                      )}
                      {emp.realization_link ? (
                        <a className="link" href={emp.realization_link} target="_blank" rel="noreferrer">
                          Buka link realisasi
                        </a>
                      ) : (
                        <span />
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {session?.role === 'admin' ? (
                        <select
                          className="select"
                          value={drafts[emp.id]?.evidence_status ?? emp.evidence_status}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [emp.id]: {
                                ...(prev[emp.id] ?? ({} as Draft)),
                                evidence_status: e.target.value as EvidenceStatus
                              }
                            }))
                          }
                        >
                          <option value="Belum">Belum</option>
                          <option value="Belum Lengkap">Belum Lengkap</option>
                          <option value="Sudah Lengkap">Sudah Lengkap</option>
                        </select>
                      ) : (
                        <Badge label={emp.evidence_status} />
                      )}
                      <div className="noteBlock">
                        {session?.role === 'admin' ? (
                          <input
                            className="input"
                            placeholder="Keterangan (jika ada kesalahan)"
                            value={drafts[emp.id]?.keterangan ?? emp.keterangan ?? ''}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [emp.id]: { ...(prev[emp.id] ?? ({} as Draft)), keterangan: e.target.value }
                              }))
                            }
                          />
                        ) : (
                          <div className="muted">Keterangan: {emp.keterangan ? emp.keterangan : '-'}</div>
                        )}

                        <div className="row" style={{ justifyContent: 'space-between' }}>
                          {emp.evidence_files?.[0]?.urlPath ? (
                            <EvidenceChip url={emp.evidence_files[0].urlPath} />
                          ) : (
                            <span className="muted">Bukti SS: -</span>
                          )}
                          {session?.role === 'admin' ? (
                            <div className="row">
                              <button
                                className="button"
                                type="button"
                                onClick={() => fileInputs.current[emp.id]?.click()}
                                disabled={rowBusy[emp.id]}
                              >
                                {rowBusy[emp.id] ? 'Upload...' : emp.evidence_files.length ? 'Ganti Bukti' : 'Upload Bukti'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {session?.role === 'admin' ? (
                        <div className="row">
                          <input
                            ref={(el) => {
                              fileInputs.current[emp.id] = el
                            }}
                            type="file"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              setRowBusy((prev) => ({ ...prev, [emp.id]: true }))
                              setError(null)
                              try {
                                const updated = await uploadEvidence(emp.id, file, { mode: 'replace' })
                                setEmployees((prev) => prev.map((p) => (p.id === emp.id ? updated : p)))
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Upload gagal')
                              } finally {
                                setRowBusy((prev) => ({ ...prev, [emp.id]: false }))
                                e.target.value = ''
                              }
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </td>
                  {session?.role === 'admin' ? (
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="button danger"
                          type="button"
                          disabled={rowBusy[emp.id]}
                          onClick={async () => {
                            const ok = window.confirm(`Hapus data "${emp.name}"?`)
                            if (!ok) return
                            setRowBusy((prev) => ({ ...prev, [emp.id]: true }))
                            setError(null)
                            try {
                              await deleteEmployee(emp.id)
                              setEmployees((prev) => prev.filter((p) => p.id !== emp.id))
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Gagal menghapus')
                            } finally {
                              setRowBusy((prev) => ({ ...prev, [emp.id]: false }))
                            }
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!filtered.length ? (
                <tr>
                  <td colSpan={session?.role === 'admin' ? 6 : 5} className="muted" style={{ padding: 14 }}>
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

