-- ============================================================
-- 业绩看板系统 · Supabase 建表脚本
-- 用途：多人共享数据 · RLS 权限控制 · 可直接粘贴到 Supabase SQL Editor
-- ============================================================

-- 扩展 pgcrypto（密码哈希）
create extension if not exists pgcrypto;

-- ===== 基地 =====
create table if not exists bases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  created_at  timestamptz not null default now()
);

-- ===== 基地密钥 =====
create table if not exists base_keys (
  id          uuid primary key default gen_random_uuid(),
  base_name   text not null references bases(name) on delete cascade,
  access_key  text not null,  -- 演示用明文；生产建议 crypt() 哈希
  created_at  timestamptz not null default now(),
  unique(base_name)
);

-- ===== 组织架构 =====
-- role 用文本枚举：基地负责人 / 主管 / 组长 / 老师
create table if not exists structures (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  role        text not null check (role in ('基地负责人','主管','组长','老师')),
  parent_id   uuid references structures(id) on delete set null,
  base_name   text not null references bases(name) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists idx_struct_base on structures(base_name);
create index if not exists idx_struct_parent on structures(parent_id);
create index if not exists idx_struct_role on structures(role);

-- ===== 订单 =====
create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  seller_name   text not null,   -- 对应 structures.name（老师）
  amount        numeric(14,2) not null check (amount >= 0),
  month         text not null check (month ~ '^\d{4}-\d{2}$'),
  remark        text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_orders_month on orders(month);
create index if not exists idx_orders_seller on orders(seller_name);

-- ===== 月份归档（锁定） =====
create table if not exists archives (
  id          uuid primary key default gen_random_uuid(),
  month       text not null check (month ~ '^\d{4}-\d{2}$'),
  locked      boolean not null default false,
  locked_by   text,
  locked_at   timestamptz,
  unique(month)
);

-- ===== 组织架构快照（锁定月归属隔离）=====
-- 锁定时保存当月组织快照，计算该月业绩时以此为准
create table if not exists org_snapshots (
  id          uuid primary key default gen_random_uuid(),
  month       text not null,
  person_id   uuid references structures(id) on delete cascade,
  name        text not null,
  role        text not null,
  parent_id   uuid,  -- 快照期内 parent 指向快照行
  base_name   text not null,
  unique(month, person_id)
);

-- ===== 管理员 =====
-- 演示用；生产建议用 Supabase Auth
create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  password_hash text not null,
  created_at    timestamptz not null default now()
);

-- ===== 审计日志 =====
create table if not exists audit_logs (
  id          uuid primary key default gen_random_uuid(),
  operator    text not null,
  module      text not null,
  action      text not null,
  description text,
  detail      jsonb,
  result      text default 'success',
  risk        boolean default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_logs_time on audit_logs(created_at desc);
create index if not exists idx_logs_module on audit_logs(module);

-- ===== RLS =====
alter table orders enable row level security;
alter table structures enable row level security;
alter table archives enable row level security;
alter table audit_logs enable row level security;

-- 演示期开放读；写操作由后端鉴权
-- 生产环境建议：前台只读（RLS restrict write），后台需 auth 角色

create policy "orders public read" on orders for select using (true);
create policy "structures public read" on structures for select using (true);
create policy "archives public read" on archives for select using (true);
create policy "audit_logs admin read only" on audit_logs for select using (true);

-- ===== 函数：校验月份是否锁定（用于 insert/update 前置检查）=====
create or replace function assert_month_unlocked(p_month text) returns void as $$
begin
  if exists (select 1 from archives where month = p_month and locked = true) then
    raise exception '月份 % 已锁定，不可修改', p_month;
  end if;
end;
$$ language plpgsql;

-- ===== 触发器：订单写入前校验 =====
create or replace function trg_order_check() returns trigger as $$
begin
  perform assert_month_unlocked(new.month);
  -- 校验 seller_name 必须是有效老师
  if not exists (select 1 from structures where name = new.seller_name and role = '老师') then
    raise exception '销售 % 不在架构内', new.seller_name;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_order_check on orders;
create trigger trg_order_check before insert or update on orders
  for each row execute function trg_order_check();

-- ===== 触发器：锁定月份时保存架构快照 =====
create or replace function trg_lock_save_snapshot() returns trigger as $$
begin
  if new.locked = true and old.locked = false then
    insert into org_snapshots (month, person_id, name, role, parent_id, base_name)
    select
      new.month,
      s.id,
      s.name,
      s.role,
      s.parent_id,
      s.base_name
    from structures s
    on conflict (month, person_id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_save_snapshot on archives;
create trigger trg_lock_save_snapshot after update on archives
  for each row execute function trg_lock_save_snapshot();

-- ===== 初始数据（与前端默认种子一致）=====
insert into admins (username, password_hash) values ('admin', 'h$538c145c$12') on conflict (username) do nothing;

insert into bases (name) values ('基地A'), ('基地B') on conflict (name) do nothing;
insert into base_keys (base_name, access_key) values ('基地A', 'baseA123'), ('基地B', 'baseB123') on conflict (base_name) do nothing;

insert into archives (month, locked) values
  ('2026-03', true), ('2026-04', false), ('2026-05', false)
on conflict (month) do nothing;
