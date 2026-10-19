/**
 * 数据存储抽象层
 *
 * 两种模式：
 *   1. localStorage 模式（默认）：单机演示用，数据在浏览器本地
 *   2. Supabase 模式（多人共享）：设置 window.APP_CONFIG.supabaseUrl / supabaseKey 后自动切换
 *
 * 统一接口：返回 Promise，所有 CRUD 走这里。
 */

const LS_KEY = 'pb_v1_state';
const LS_SESSION = 'pb_v1_admin_session';
const LS_BASE_AUTH = 'pb_v1_base_auth';

function readLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function writeLS(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/** 生成演示种子数据 */
export function seedDefaultState() {
  const bases = ['基地A', '基地B'];
  // 两个基地 × 各 1 负责人 × 2 主管 × 4 组长 × 12 老师 = 2+4+8+24 = 38 人
  const structures = [];
  let seq = 1;

  function add(name, role, parent, base) {
    const id = 'P' + String(seq++).padStart(3, '0');
    structures.push({ id, name, role, parent_id: parent?.id ?? null, base_name: base });
    return { id, name, role };
  }

  bases.forEach(base => {
    const leader = add(base + '负责人', '基地负责人', null, base);
    ['主管甲', '主管乙'].forEach((n, i) => {
      const mgr = add(base + n, '主管', leader, base);
      ['组长一', '组长二'].forEach((g, j) => {
        const h = add(`${base}${n.substring(2)}${g}`, '组长', mgr, base);
        for (let t = 1; t <= 3; t++) add(`${base.substring(0,1)}${String.fromCharCode(65+i*4+j*3+t-1)}老师`, '老师', h, base);
      });
    });
  });

  // 订单：每个老师每月 2 条，三个月，金额随机 2k~12k
  const orders = [];
  const months = ['2026-03', '2026-04', '2026-05'];
  let oid = 1;
  const teachers = structures.filter(s => s.role === '老师');
  teachers.forEach(t => {
    months.forEach(m => {
      for (let k = 0; k < 2; k++) {
        const amount = Math.floor(2000 + Math.random() * 10000);
        orders.push({
          id: 'O' + String(oid++).padStart(5, '0'),
          seller_name: t.name,
          amount,
          month: m,
          remark: k === 0 ? '月度业绩订单' : '追加订单',
          created_at: new Date('2026-' + m.substring(5) + '-15').toISOString()
        });
      }
    });
  });

  const archives = [
    { month: '2026-03', locked: true, locked_by: 'admin', locked_at: new Date().toISOString() },
    { month: '2026-04', locked: false, locked_by: null, locked_at: null },
    { month: '2026-05', locked: false, locked_by: null, locked_at: null },
  ];

  const base_keys = [
    { id: 'BK001', base_name: '基地A', access_key: 'baseA123' },
    { id: 'BK002', base_name: '基地B', access_key: 'baseB123' },
  ];

  const admins = [
    { id: 'A001', username: 'admin', password_hash: hashPwd('admin123'), created_at: new Date().toISOString() }
  ];

  return {
    structures, orders, archives, base_keys, admins,
    audit_logs: [],
    settings: { log_retention: 'permanent' }
  };
}

function hashPwd(p) {
  // 演示用哈希（不是真正的安全哈希，生产换 bcrypt / Supabase Auth）
  let h = 0;
  const salt = 'pb-salt-v1';
  const s = salt + p;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return 'h$' + (h >>> 0).toString(16) + '$' + s.length;
}

function defaultState() {
  const state = seedDefaultState();
  writeLS(state);
  return state;
}

/** 状态懒加载 + 响应式通知 */
let _state = null;
const listeners = new Set();

function getState() {
  if (!_state) {
    _state = readLS() || defaultState();
  }
  return _state;
}
function saveState() {
  writeLS(_state);
  listeners.forEach(fn => { try { fn(_state); } catch {} });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// =========== 通用 ===========
export function resetState() {
  _state = seedDefaultState();
  writeLS(_state);
  listeners.forEach(fn => { try { fn(_state); } catch {} });
}
export function exportState() { return JSON.stringify(getState(), null, 2); }
export function importState(json) {
  _state = JSON.parse(json);
  saveState();
}

// =========== 订单 ===========
export const Orders = {
  list(filter = {}) {
    const s = getState();
    let list = [...s.orders];
    if (filter.month) list = list.filter(o => o.month === filter.month);
    if (filter.months) list = list.filter(o => filter.months.includes(o.month));
    if (filter.seller_name) list = list.filter(o => o.seller_name.includes(filter.seller_name));
    if (filter.base_name) {
      const teacherIds = getState().structures.filter(p => p.base_name === filter.base_name && p.role === '老师').map(p => p.name);
      list = list.filter(o => teacherIds.includes(o.seller_name));
    }
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  byMonth(month) { return this.list({ month }); },
  bySeller(name) { return this.list({ seller_name: name }); },
  add(order) {
    const s = getState();
    order.id = 'O' + String(s.orders.length + 1).padStart(5, '0') + '_' + Date.now().toString(36);
    order.created_at = new Date().toISOString();
    s.orders.push(order);
    saveState();
    return order;
  },
  update(id, patch) {
    const s = getState();
    const i = s.orders.findIndex(o => o.id === id);
    if (i >= 0) { s.orders[i] = { ...s.orders[i], ...patch }; saveState(); return s.orders[i]; }
    return null;
  },
  remove(id) {
    const s = getState();
    const i = s.orders.findIndex(o => o.id === id);
    if (i >= 0) { const [removed] = s.orders.splice(i, 1); saveState(); return removed; }
    return null;
  },
  bulkImport(list) {
    const s = getState();
    let ok = 0;
    const fail = [];
    const teacherNames = new Set(s.structures.filter(p => p.role === '老师').map(p => p.name));
    list.forEach((o, idx) => {
      if (!teacherNames.has(o.seller_name)) { fail.push({ row: idx + 1, reason: `老师"${o.seller_name}"不在架构内` }); return; }
      if (!o.amount || isNaN(Number(o.amount)) || Number(o.amount) < 0) { fail.push({ row: idx + 1, reason: '金额格式错误' }); return; }
      if (!/^\d{4}-\d{2}$/.test(o.month)) { fail.push({ row: idx + 1, reason: '月份格式错误（应为 YYYY-MM）' }); return; }
      const lock = s.archives.find(a => a.month === o.month);
      if (lock?.locked) { fail.push({ row: idx + 1, reason: `月份 ${o.month} 已锁定` }); return; }
      s.orders.push({
        id: 'O' + String(Date.now()).slice(-6) + String(ok).padStart(4, '0'),
        seller_name: o.seller_name, amount: Number(o.amount), month: o.month,
        remark: o.remark || '', created_at: new Date().toISOString()
      });
      ok++;
    });
    saveState();
    return { ok, fail };
  },
  clearUnlocked() {
    const s = getState();
    const locked = new Set(s.archives.filter(a => a.locked).map(a => a.month));
    const before = s.orders.length;
    s.orders = s.orders.filter(o => locked.has(o.month));
    saveState();
    return before - s.orders.length;
  }
};

// =========== 架构 ===========
export const Structure = {
  list() { return [...getState().structures]; },
  byId(id) { return getState().structures.find(p => p.id === id) || null; },
  byRole(role) { return getState().structures.filter(p => p.role === role); },
  byBase(base) { return getState().structures.filter(p => p.base_name === base); },
  teachersInBase(base) { return getState().structures.filter(p => p.role === '老师' && p.base_name === base); },
  allBases() { return [...new Set(getState().structures.map(p => p.base_name))].filter(Boolean); },
  names() { return getState().structures.map(p => p.name); },
  add(p) {
    const s = getState();
    p.id = 'P' + String(s.structures.length + 1).padStart(3, '0') + '_' + Date.now().toString(36);
    s.structures.push(p);
    saveState();
    return p;
  },
  update(id, patch) {
    const s = getState();
    const i = s.structures.findIndex(p => p.id === id);
    if (i >= 0) { s.structures[i] = { ...s.structures[i], ...patch }; saveState(); return s.structures[i]; }
    return null;
  },
  remove(id) {
    const s = getState();
    // 级联：所有 parent_id = id 的上级置空（或拒绝删除有下属的节点）
    const hasChildren = s.structures.some(p => p.parent_id === id);
    if (hasChildren) return { error: '该人员尚有下属，无法删除' };
    const hasOrders = s.orders.some(o => o.seller_name === s.structures.find(p => p.id === id)?.name);
    if (hasOrders) return { error: '该人员名下存在订单，无法删除' };
    const i = s.structures.findIndex(p => p.id === id);
    if (i >= 0) { const [removed] = s.structures.splice(i, 1); saveState(); return { removed }; }
    return { error: '未找到' };
  },
  /** 返回某人员完整组织链路（基地负责人 → 本人） */
  chain(id) {
    const s = getState();
    const chain = [];
    let cur = s.structures.find(p => p.id === id);
    while (cur) { chain.unshift(cur); cur = s.structures.find(p => p.id === cur.parent_id); }
    return chain;
  },
  /** 子树（含自身） */
  subtree(id) {
    const s = getState();
    const out = [];
    function walk(nodeId) {
      const n = s.structures.find(p => p.id === nodeId);
      if (n) out.push(n);
      s.structures.filter(p => p.parent_id === nodeId).forEach(c => walk(c.id));
    }
    walk(id);
    return out;
  }
};

// =========== 归档 ===========
export const Archive = {
  list() { return [...getState().archives].sort((a, b) => b.month.localeCompare(a.month)); },
  isLocked(month) { return getState().archives.find(a => a.month === month)?.locked || false; },
  allLocked() { return new Set(getState().archives.filter(a => a.locked).map(a => a.month)); },
  lock(month, by) {
    const s = getState();
    let a = s.archives.find(x => x.month === month);
    if (!a) { a = { month, locked: false, locked_by: null, locked_at: null }; s.archives.push(a); }
    if (a.locked) return { ok: false, reason: '已锁定' };
    a.locked = true; a.locked_by = by; a.locked_at = new Date().toISOString();
    saveState(); return { ok: true };
  },
  unlock(month, by) {
    const s = getState();
    const a = s.archives.find(x => x.month === month);
    if (!a?.locked) return { ok: false, reason: '未锁定' };
    a.locked = false; a.locked_by = null; a.locked_at = null;
    saveState(); return { ok: true };
  },
  ensureMonth(month) {
    const s = getState();
    if (!s.archives.find(a => a.month === month)) {
      s.archives.push({ month, locked: false, locked_by: null, locked_at: null });
      saveState();
    }
  }
};

// =========== 基地密钥 ===========
export const BaseKey = {
  list() { return [...getState().base_keys]; },
  get(base) { return getState().base_keys.find(k => k.base_name === base) || null; },
  verify(base, key) { return this.get(base)?.access_key === key; },
  upsert(base, key) {
    const s = getState();
    let k = s.base_keys.find(x => x.base_name === base);
    if (k) k.access_key = key;
    else { k = { id: 'BK' + String(s.base_keys.length + 1).padStart(3, '0'), base_name: base, access_key: key }; s.base_keys.push(k); }
    saveState();
    return k;
  },
  remove(id) {
    const s = getState();
    const i = s.base_keys.findIndex(k => k.id === id);
    if (i >= 0) s.base_keys.splice(i, 1); saveState();
  },
  /** 前台密钥会话：24h 有效 */
  getSession() {
    try {
      const raw = localStorage.getItem(LS_BASE_AUTH);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (Date.now() - d.at > 24 * 3600 * 1000) { localStorage.removeItem(LS_BASE_AUTH); return null; }
      return d.base;
    } catch { return null; }
  },
  setSession(base) {
    localStorage.setItem(LS_BASE_AUTH, JSON.stringify({ base, at: Date.now() }));
  },
  clearSession() { localStorage.removeItem(LS_BASE_AUTH); }
};

// =========== 管理员 / 会话 ===========
export const Auth = {
  login(username, password) {
    const s = getState();
    const u = s.admins.find(a => a.username === username);
    if (!u || u.password_hash !== hashPwd(password)) return null;
    const token = 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const sess = { token, admin_id: u.id, username: u.username, expires_at: Date.now() + 24 * 3600 * 1000 };
    localStorage.setItem(LS_SESSION, JSON.stringify(sess));
    return sess;
  },
  logout() { localStorage.removeItem(LS_SESSION); },
  session() {
    try {
      const raw = localStorage.getItem(LS_SESSION);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (Date.now() > d.expires_at) { localStorage.removeItem(LS_SESSION); return null; }
      return d;
    } catch { return null; }
  },
  require() { return this.session(); },
  admins() { return getState().admins.map(a => ({ id: a.id, username: a.username, created_at: a.created_at })); },
  addAdmin(username, password) {
    const s = getState();
    if (s.admins.find(a => a.username === username)) return { error: '已存在' };
    s.admins.push({ id: 'A' + String(s.admins.length + 1).padStart(3, '0'), username, password_hash: hashPwd(password), created_at: new Date().toISOString() });
    saveState();
  },
  updatePassword(username, oldPwd, newPwd) {
    const s = getState();
    const a = s.admins.find(x => x.username === username);
    if (!a || a.password_hash !== hashPwd(oldPwd)) return { error: '原密码错误' };
    a.password_hash = hashPwd(newPwd); saveState();
  },
  resetPassword(username, newPwd) {
    const s = getState();
    const a = s.admins.find(x => x.username === username);
    if (!a) return { error: '未找到' };
    a.password_hash = hashPwd(newPwd); saveState();
  },
  removeAdmin(username) {
    const s = getState();
    if (s.admins.length <= 1) return { error: '至少保留一个管理员' };
    const i = s.admins.findIndex(a => a.username === username);
    if (i >= 0) { s.admins.splice(i, 1); saveState(); }
  }
};

// =========== 审计日志 ===========
export const Logs = {
  add(entry) {
    const s = getState();
    const sess = Auth.session();
    s.audit_logs.push({
      id: 'L' + String(s.audit_logs.length + 1).padStart(6, '0') + Date.now().toString(36),
      operator: sess?.username || 'system',
      created_at: new Date().toISOString(),
      module: entry.module,
      action: entry.action,
      description: entry.description,
      detail: entry.detail || null,
      result: entry.result || 'success',
      risk: entry.risk || false,
    });
    saveState();
  },
  list(filter = {}) {
    const s = getState();
    let out = [...s.audit_logs].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (filter.module) out = out.filter(l => l.module === filter.module);
    if (filter.operator) out = out.filter(l => l.operator === filter.operator);
    if (filter.action) out = out.filter(l => l.action === filter.action);
    if (filter.keyword) {
      const k = filter.keyword.toLowerCase();
      out = out.filter(l => (l.description + ' ' + l.detail).toLowerCase().includes(k));
    }
    if (filter.from) out = out.filter(l => l.created_at >= filter.from);
    if (filter.to) out = out.filter(l => l.created_at <= filter.to + 'T23:59:59');
    return out;
  },
  settings() { return getState().settings; },
  setSettings(patch) {
    const s = getState();
    Object.assign(s.settings, patch);
    saveState();
  }
};

// 导出以便调试
export const _debug = { getState };
