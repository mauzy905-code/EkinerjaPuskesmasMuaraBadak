-- Script SQL ini dijalankan di Supabase Dashboard -> SQL Editor

-- 1. Buat Tabel Employees
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_status text not null default 'Kosong',
  realization_status text not null default 'Kosong',
  evidence_status text not null default 'Kosong',
  realization_link text,
  keterangan text,
  evidence_files jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table employees add column if not exists keterangan text;

alter table employees alter column plan_status set default 'Kosong';
alter table employees alter column realization_status set default 'Kosong';
alter table employees alter column evidence_status set default 'Kosong';

update employees set plan_status = 'Kosong' where plan_status = 'Belum';
update employees set plan_status = 'Selesai' where plan_status = 'Sudah';

update employees set realization_status = 'Kosong' where realization_status = 'Belum';
update employees set realization_status = 'Selesai' where realization_status = 'Sudah';

update employees set evidence_status = 'Kosong' where evidence_status = 'Belum';
update employees set evidence_status = 'Selesai' where evidence_status = 'Sudah Lengkap';

-- Mengaktifkan RLS (Row Level Security)
alter table employees enable row level security;

-- Policy agar semua orang bisa melihat (read-only)
create policy "Public read access"
  on employees for select
  using (true);

-- Policy agar hanya pengguna terotentikasi (admin) yang bisa insert/update/delete
create policy "Admin all access"
  on employees for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');


-- 2. Mengaktifkan Supabase Realtime untuk tabel employees
alter publication supabase_realtime add table employees;


-- 3. Setup Storage (Buckets) untuk bukti dukung
insert into storage.buckets (id, name, public) 
values ('evidences', 'evidences', true)
on conflict (id) do nothing;

-- Policy untuk Storage: Public bisa melihat file (download)
create policy "Public view evidences"
  on storage.objects for select
  using (bucket_id = 'evidences');

-- Policy untuk Storage: Hanya admin yang bisa upload/insert
create policy "Admin upload evidences"
  on storage.objects for insert
  with check (bucket_id = 'evidences' and auth.role() = 'authenticated');

create policy "Admin delete evidences"
  on storage.objects for delete
  using (bucket_id = 'evidences' and auth.role() = 'authenticated');


-- 4. Opsional: Data dummy awal
insert into employees (name, plan_status) values 
('Contoh Pegawai 1', 'Kosong'),
('Contoh Pegawai 2', 'Selesai')
on conflict do nothing;
