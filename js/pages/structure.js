/** 组织架构 /structure */
import { h, $, clear, fmtMoney } from '../ui.js';
import { BaseKey } from '../store.js';
import { buildBaseTree, allMonths, rollupMonths } from '../engine.js';

export function pageStructure() {
  const app = $('#app');
  clear(app);
  const base = BaseKey.getSession();
  const months = allMonths();
  const selected = h('select', { id: 'str-month' },
    h('option', { value: '' }, '全部月份'),
    ...months.map(m => h('option', { value: m }, m))
  );
  const input = h('input', { type: 'text', placeholder: '搜索姓名 / 岗位', id: 'str-filter' });
  const treeBox = h('div', { id: 'str-tree', style: { marginTop: '16px' } });

  function redraw() {
    clear(treeBox);
    const realMonths = selected.value ? [selected.value] : months;
    const tree = buildBaseTree(base, realMonths);
    const q = input.value.trim();
    if (!tree.length) { treeBox.append(h('div', { class: 'empty' }, '本基地暂无组织架构')); return; }
    tree.forEach(n => treeBox.appendChild(renderNode(n, 0, q)));
  }

  selected.addEventListener('change', redraw);
  input.addEventListener('input', redraw);

  app.append(
    h('div', { class: 'page-header' },
      h('div', {},
        h('div', { class: 'page-title' }, '组织架构'),
        h('div', { class: 'page-sub' }, '基地：' + base + '  ·  只读视图'),
      )
    ),
    h('div', { class: 'card' },
      h('div', { class: 'card-body' },
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '搜索'), input),
          h('div', { class: 'form-group', style: { maxWidth: 180 } }, h('label', {}, '月份'), selected)
        )
      )
    ),
    treeBox
  );
  redraw();
}

function renderNode(node, depth, q) {
  const hasChildren = node.children?.length > 0;
  const roleCls = node.role === '基地负责人' ? 'president' : node.role === '主管' ? 'manager' : node.role === '组长' ? 'leader' : 'teacher';
  const head = h('div', { class: 'tree-head', style: { paddingLeft: depth * 12 } },
    h('span', { class: 'tree-toggle', 'data-toggle': '1' }, hasChildren ? '▼' : '·'),
    h('span', { class: 'tree-role ' + roleCls }, node.role),
    h('span', { class: 'tree-name' }, node.name),
    h('span', { class: 'tree-sub' },
      h('span', { style: { marginRight: 10 } }, '团队业绩 ' + fmtMoney(node.team_perf)),
      node.role === '老师' ? h('span', { class: 'muted' }, '个人 ' + fmtMoney(node.own_perf)) : h('span', { class: 'muted' }, node.children?.length + ' 下属')
    )
  );
  const box = h('div', { class: 'tree-node' }, head);

  // 详情面板（点开后展开）
  const detail = h('div', { hidden: true, style: { marginLeft: 28, padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 6, marginTop: 4, border: '1px solid var(--line)' } });
  head.addEventListener('click', () => {
    if (hasChildren) {
      const collapsed = head.querySelector('[data-toggle]').textContent === '▶';
      head.querySelector('[data-toggle]').textContent = collapsed ? '▼' : '▶';
      box.querySelectorAll(':scope > .tree-node').forEach(c => c.hidden = collapsed ? false : true);
    }
    detail.hidden = !detail.hidden;
    if (!detail.hidden && !detail.children.length) {
      buildDetail(node, detail);
    }
  });

  // 搜索过滤
  if (q) {
    const hit = node.name.includes(q) || node.role.includes(q);
    if (!hit && hasChildren) {
      const anyChild = node.children.some(c => treeHit(c, q));
      if (!anyChild) return null;
    }
  }

  box.append(detail);
  if (hasChildren) node.children.forEach(c => {
    const child = renderNode(c, depth + 1, q);
    if (child) box.append(child);
  });
  return box;
}

function treeHit(n, q) {
  if (n.name.includes(q) || n.role.includes(q)) return true;
  return n.children?.some(c => treeHit(c, q)) || false;
}

function buildDetail(node, detail) {
  const chain = node.chain || [];
  detail.append(
    h('div', { class: 'flex-between' },
      h('div', {}, h('b', {}, node.name)),
      h('span', { class: 'badge badge-brand' }, node.role)
    ),
    h('div', { class: 'divider' }),
    h('div', { class: 'grid-2' },
      h('div', {}, h('div', { class: 'muted', style: { fontSize: 12 } }, '团队业绩'), h('div', { class: 'amount' }, fmtMoney(node.team_perf))),
      h('div', {}, h('div', { class: 'muted', style: { fontSize: 12 } }, '老师个人业绩'), h('div', { class: 'amount' }, fmtMoney(node.own_perf))),
    ),
    node.role !== '老师' && node.children ? h('div', { style: { marginTop: 8 } },
      h('div', { class: 'muted', style: { fontSize: 12, marginBottom: 6 } }, '直接下属（' + node.children.length + ' 人）'),
      h('div', {}, node.children.map(c => h('span', { class: 'badge badge-ink', style: { marginRight: 6, marginBottom: 4 } }, c.name + ' · ' + c.role)))
    ) : null,
    h('div', { style: { marginTop: 8 } },
      h('div', { class: 'muted', style: { fontSize: 12, marginBottom: 4 } }, '归属链路'),
      h('div', {}, chain.map(c => h('span', { class: 'badge badge-brand', style: { marginRight: 4, fontSize: 11 } }, c.name + '（' + c.role + '）')))
    )
  );
}
