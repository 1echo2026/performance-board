/** 后台 - 操作日志 */
import { h, $, clear, fmtDate, toast, modal, download, toCSV } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { Logs } from '../store.js';

const state = { page: 1, pageSize: 30, filter: {} };

export function pageAdminLogs() {
  const root = h('div', {});
  adminLayout('操作日志', root);

  const keyword = h('input', { type: 'text', placeholder: '关键词', oninput: e => { state.filter.keyword = e.target.value; state.page = 1; redraw(); } });
  const moduleSel = h('select', { onchange: e => { state.filter.module = e.target.value; state.page = 1; redraw(); } },
    h('option', { value: '' }, '全部模块'),
    ...['登录', '订单', '架构', '归档', '基地密钥', '系统设置'].map(m => h('option', { value: m }, m))
  );
  const fromEl = h('input', { type: 'date', onchange: e => { state.filter.from = e.target.value; state.page = 1; redraw(); } });
  const toEl = h('input', { type: 'date', onchange: e => { state.filter.to = e.target.value; state.page = 1; redraw(); } });

  const box = h('div', {});

  function redraw() {
    const list = Logs.list(state.filter);
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const sliced = list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);
    clear(box);
    box.append(
      h('div', { class: 'card', style: { marginBottom: 14 } },
        h('div', { class: 'card-body' },
          h('div', { class: 'alert alert-info' }, '日志不可编辑、不可删除，是系统全量审计留痕。高危操作（解锁月份等）以红色高亮标记。'),
          h('div', { class: 'form-row', style: { marginTop: 10 } },
            h('div', { class: 'form-group', style: { maxWidth: 180 } }, h('label', {}, '模块'), moduleSel),
            h('div', { class: 'form-group' }, h('label', {}, '关键词'), keyword),
            h('div', { class: 'form-group', style: { maxWidth: 160 } }, h('label', {}, '起始日期'), fromEl),
            h('div', { class: 'form-group', style: { maxWidth: 160 } }, h('label', {}, '截止日期'), toEl),
            h('div', { style: { alignSelf: 'flex-end', marginLeft: 'auto', display: 'flex', gap: 8 } },
              h('button', { class: 'btn', onclick: () => {
                const list = Logs.list(state.filter);
                download('审计日志_' + new Date().toISOString().slice(0, 10) + '.csv', toCSV(list, [
                  { label: '时间', value: r => fmtDate(r.created_at) },
                  { label: '操作人', key: 'operator' }, { label: '模块', key: 'module' },
                  { label: '操作', key: 'action' }, { label: '描述', key: 'description' },
                  { label: '结果', key: 'result' }, { label: '详情', value: r => JSON.stringify(r.detail || '') }
                ]));
                toast('导出成功', 'success');
              } }, '📤 导出筛选结果')
            )
          )
        )
      ),
      h('div', { class: 'card' },
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('div', { class: 'table-wrap' },
            h('table', {},
              h('thead', {}, h('tr', {},
                h('th', {}, '时间'), h('th', {}, '操作人'), h('th', {}, '模块'),
                h('th', {}, '操作'), h('th', {}, '描述'), h('th', {}, '详情'), h('th', {}, '风险')
              )),
              h('tbody', {}, sliced.length ? sliced.map(l => h('tr', { style: l.risk ? { background: 'var(--danger-soft)' } : {} },
                h('td', { class: 'mono', style: { color: '#6b7280', fontSize: 12 } }, fmtDate(l.created_at)),
                h('td', {}, h('span', { class: 'badge badge-brand' }, l.operator)),
                h('td', {}, l.module),
                h('td', {}, h('span', { class: 'badge badge-ink' }, l.action)),
                h('td', {}, l.description),
                h('td', {}, l.detail
                  ? h('button', { class: 'btn btn-sm btn-link', onclick: () => showDetail(l) }, '查看')
                  : h('span', { class: 'muted', style: { fontSize: 12 } }, '-')),
                h('td', {}, l.risk ? h('span', { class: 'badge badge-danger' }, '⚠️ 高危') : h('span', { class: 'muted', style: { fontSize: 12 } }, '—'))
              )) : h('tr', {}, h('td', { colspan: 7, style: { textAlign: 'center', padding: '32px', color: '#9ca3af' } }, '暂无日志'))
            )
          )
        )
      ),
      h('div', { class: 'flex-between', style: { marginTop: 12 } },
        h('span', { class: 'muted' }, `共 ${list.length} 条 · 第 ${state.page}/${totalPages} 页`),
        h('div', { class: 'gap-8' },
          h('button', { class: 'btn btn-sm', disabled: state.page <= 1, onclick: () => { state.page--; redraw(); } }, '上一页'),
          h('button', { class: 'btn btn-sm', disabled: state.page >= totalPages, onclick: () => { state.page++; redraw(); } }, '下一页'),
        )
      )
    );
  }

  function showDetail(l) {
    modal({
      title: '日志详情',
      size: 'md',
      body: h('div', {},
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '操作人'), h('div', {}, l.operator)),
          h('div', { class: 'form-group' }, h('label', {}, '时间'), h('div', {}, fmtDate(l.created_at))),
        ),
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '模块'), h('div', {}, l.module)),
          h('div', { class: 'form-group' }, h('label', {}, '操作'), h('div', {}, l.action)),
        ),
        h('div', { class: 'form-group' }, h('label', {}, '描述'), h('div', {}, l.description)),
        h('div', { class: 'divider' }),
        h('div', { class: 'form-group' }, h('label', {}, '新值 / 旧值对比 (JSON)'),
          h('pre', { style: { background: 'var(--surface-2)', padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 300, fontSize: 12, fontFamily: 'var(--mono)' } }, l.detail ? JSON.stringify(l.detail, null, 2) : '（无详情）')
        )
      )
    });
  }

  root.append(box);
  redraw();
}
