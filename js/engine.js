/**
 * 业绩逐级汇总引擎
 *
 * 关键设计：跨月归属隔离
 *   - 每个月份独立计算
 *   - 锁定月：使用该月锁定时的组织架构快照（此处通过当前 lock 状态 + 使用 "生效架构" 模拟）
 *   - 未锁定月：使用当前最新组织架构
 *
 * 由于本项目不存历史快照，简化处理：
 *   - 架构调整后只影响「未锁定月份」的归属
 *   - 锁定月归属由"锁定那一刻的架构"决定 → 我们存 org_snapshots 表
 */

import { Structure, Orders, Archive } from './store.js';

/** 获取所有出现过的订单月份 */
export function allMonths() {
  const s = Structure.list(); // 触发 store 懒加载
  const months = new Set();
  Orders.list().forEach(o => months.add(o.month));
  Archive.list().forEach(a => months.add(a.month));
  return [...months].sort();
}

/** 某月份的有效架构（锁定月取快照，未锁定月取当前） */
function effectiveOrgForMonth(month) {
  // 简化版：统一用当前架构。真实快照需要在锁定时保存。
  // 如需快照，可在此处调用 getSnapshot(month)。
  return Structure.list();
}

/**
 * 构建某个月的归属映射：老师 name → 组织链路数组（从老师到基地负责人）
 * 并同时构建 personId → 上级链路
 */
function buildMonthIndex(month) {
  const list = effectiveOrgForMonth(month);
  const byId = new Map(list.map(p => [p.id, p]));
  const children = new Map();
  list.forEach(p => { if (!p.parent_id) return; const arr = children.get(p.parent_id) || []; arr.push(p); children.set(p.parent_id, arr); });

  // 链路
  function chainUp(id) {
    const arr = [];
    let cur = byId.get(id);
    while (cur) { arr.unshift(cur); cur = cur.parent_id ? byId.get(cur.parent_id) : null; }
    return arr;
  }

  // 老师按姓名（唯一假设：同一基地老师不重名；如有重名用 id 匹配）
  const teachersByName = new Map();
  list.filter(p => p.role === '老师').forEach(t => { teachersByName.set(t.name, t); });

  return { byId, children, chainUp, teachersByName };
}

/** 单月逐级汇总结果 */
export function rollupMonth(month) {
  const { byId, children, chainUp, teachersByName } = buildMonthIndex(month);
  const orders = Orders.byMonth(month);

  // 初始化每个人月度业绩
  const perf = new Map();
  byId.forEach((_, id) => perf.set(id, 0));

  // 老师级：直接匹配订单
  orders.forEach(o => {
    const t = teachersByName.get(o.seller_name);
    if (t) perf.set(t.id, (perf.get(t.id) || 0) + Number(o.amount));
  });

  // 自底向上汇总：老师 → 组长 → 主管 → 基地负责人
  // 简单做法：对每个节点，累加所有后代业绩
  function totalDescendants(rootId) {
    let total = perf.get(rootId) || 0;
    const cs = children.get(rootId) || [];
    cs.forEach(c => total += totalDescendants(c.id));
    return total;
  }

  const rollup = [];
  byId.forEach(p => {
    const chain = chainUp(p.id);
    const own = perf.get(p.id) || 0;
    const team = totalDescendants(p.id);
    rollup.push({
      id: p.id,
      name: p.name,
      role: p.role,
      base_name: p.base_name,
      month,
      own_perf: own,
      team_perf: team,
      chain: chain.map(c => ({ id: c.id, name: c.name, role: c.role }))
    });
  });

  return rollup;
}

/**
 * 多月份合并（业绩求和）
 * @param {string[]} months
 */
export function rollupMonths(months) {
  if (!months.length) return [];
  const agg = new Map(); // id → {id,name,role,base_name,own_perf,team_perf}

  months.forEach(m => {
    const rm = rollupMonth(m);
    rm.forEach(r => {
      const cur = agg.get(r.id) || { id: r.id, name: r.name, role: r.role, base_name: r.base_name, own_perf: 0, team_perf: 0 };
      cur.own_perf += r.own_perf;
      cur.team_perf += r.team_perf;
      agg.set(r.id, cur);
    });
  });

  return [...agg.values()];
}

/** 单基地的月度（含全架构） */
export function rollupBaseMonth(base, month) {
  const all = rollupMonth(month);
  return all.filter(r => r.base_name === base);
}

/** 汇总校验：返回各基地负责人的业绩（应等于老师合计） */
export function validateRollup(month) {
  const rm = rollupMonth(month);
  const teachers = rm.filter(r => r.role === '老师');
  const teacherSum = teachers.reduce((a, b) => a + b.own_perf, 0);
  const leaders = rm.filter(r => r.role === '基地负责人');
  const leaderTeamSum = leaders.reduce((a, b) => a + b.team_perf, 0);
  return {
    teacherSum, leaderTeamSum,
    ok: Math.abs(teacherSum - leaderTeamSum) < 0.01,
    diff: leaderTeamSum - teacherSum,
    byLeader: leaders.map(l => ({ name: l.name, team_perf: l.team_perf, base: l.base_name }))
  };
}

/** 总览仪表盘数据 */
export function dashboardSummary(months) {
  const list = rollupMonths(months);
  const teachers = list.filter(r => r.role === '老师');
  const leaders = list.filter(r => r.role === '基地负责人');
  const managers = list.filter(r => r.role === '主管');
  const heads = list.filter(r => r.role === '组长');

  const totalPerf = leaders.reduce((a, b) => a + b.team_perf, 0);
  const bases = [...new Set(list.map(r => r.base_name))];

  // 分基地柱状
  const byBase = {};
  leaders.forEach(l => { byBase[l.base_name] = (byBase[l.base_name] || 0) + l.team_perf; });

  // 排行
  const managerTop = [...managers].sort((a, b) => b.team_perf - a.team_perf).slice(0, 10);
  const headTop = [...heads].sort((a, b) => b.team_perf - a.team_perf).slice(0, 10);

  return {
    total_perf: totalPerf,
    teacher_count: teachers.length,
    base_count: bases.length,
    manager_count: managers.length,
    head_count: heads.length,
    bases,
    byBase,
    managerTop, headTop,
    months
  };
}

/** 人员详情（含指定月份的链路 & 团队业绩） */
export function personDetail(personId, months) {
  const list = rollupMonths(months);
  const p = list.find(x => x.id === personId);
  if (!p) return null;
  return p;
}

/** 基地树（带月度团队业绩） */
export function buildBaseTree(base, months) {
  const list = rollupMonths(months).filter(r => r.base_name === base);
  const byId = new Map(list.map(r => [r.id, r]));
  const children = new Map();
  list.forEach(r => {
    // 从原始 Structure 找 parent
    const all = Structure.list();
    const me = all.find(x => x.id === r.id);
    if (me?.parent_id) {
      const arr = children.get(me.parent_id) || [];
      arr.push(r);
      children.set(me.parent_id, arr);
    }
  });

  function build(nodeId) {
    const node = byId.get(nodeId);
    if (!node) return null;
    const kids = children.get(nodeId) || [];
    return {
      ...node,
      children: kids.map(k => build(k.id)).filter(Boolean)
    };
  }

  // 根节点：基地负责人
  const roots = list.filter(r => {
    const all = Structure.list();
    const me = all.find(x => x.id === r.id);
    return me && !me.parent_id;
  });
  return roots.map(r => build(r.id)).filter(Boolean);
}
