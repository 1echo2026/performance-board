/** 订单明细 /orders */
import { h, $, clear, fmtMoney, fmtDate, toast, download, toCSV } from '../ui.js';
import { BaseKey, Orders } from '../store.js';

const PAGE_SIZE = 20;

export function pageOrders() {
  const app = $('#app');
  clear(app);
  const base = BaseKey.getSession();

  const monthSel = h('input', { type: 'month', id: 'od-month' });
  const nameInput = h('input', { type: 'text', placeholder: '老师姓名', id: 'od-name' });
  const pageBox = h('div', { id: 'od-page', style: { marginTop: '12px' } });

  const state = { page: 1 };

  function getData() {
    const month = monthSel.value;
    const name = nameInput.value.trim();
    const teacherIds = [...new Set(
      Orders.list()
        .filter(o => !name || o.seller_name.includes(name))
        .map(o => o.seller_name)
    )];
    return Orders.list({ base_name: base, month: month || undefined, seller_name: name || undefined });
  }

  function render() {
    const data = getData();
    const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
    if (state.page > totalPages) state.page = totalPages;
    const sliced = data.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

    pageBox.innerHTML = '';
    pageBox.append(
      h('div', { class: 'card', style: { marginBottom: 14 } },
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('div', { class: 'table-wrap' },
            h('table', {},
              h('thead', {}, h('tr', {},
                h('th', {}, '订单号'), h('th', {}, '销售（老师）'), h('th', { style: { textAlign: 'right' } }, '业绩金额'),
                h('th', {}, '月份'), h('th', {}, '备注'), h('th', {}, '创建时间')
              )),
              h('tbody', {}, sliced.length ? sliced.map(o => h('tr', {},
                h('td', { class: 'mono' }, o.id),
                h('td', {}, o.seller_name),
                h('td', { class: 'amount' }, fmtMoney(o.amount)),
                h('td', {}, o.month),
                h('td', { class: 'ellipsis', style: { maxWidth: 180 } }, o.remark || '-'),
                h('td', { class: 'muted' }, fmtDate(o.created_at))
              )) : h('tr', {}, h('td', { colspan: 6, style: { textAlign: 'center', padding: '32px', color: '#9ca3af' } }, '无订单'))
            )
          )
        )
      ),
      // 分页
      h('div', { class: 'flex-between' },
        h('span', { class: 'muted', style: { fontSize: 13 } },
          `共 ${data.length} 条 · 第 ${state.page} / ${totalPages} 页`
        ),
        h('div', { class: 'gap-8' },
          h('button', { class: 'btn btn-sm', disabled: state.page <= 1, onclick: () => { state.page--; render(); } }, '上一页'),
          h('button', { class: 'btn btn-sm', disabled: state.page >= totalPages, onclick: () => { state.page++; render(); } }, '下一页'),
        )
      )
    );
  }

  function doExport() {
    const data = getData();
    if (!data.length) { toast('无数据可导出', 'warn'); return; }
    const csv = toCSV(data, [
      { label: '订单号', key: 'id' },
      { label: '销售姓名', key: 'seller_name' },
      { label: '业绩金额', key: 'amount' },
      { label: '月份', key: 'month' },
      { label: '备注', key: 'remark' },
      { label: '创建时间', value: r => fmtDate(r.created_at) },
    ]);
    download(`${base}_订单明细_${new Date().toISOString().slice(0,10)}.csv`, csv, 'text/csv;charset=utf-8');
    toast('导出成功', 'success');
  }

  [monthSel, nameInput].forEach(el => el.addEventListener('input', () => { state.page = 1; render(); }));

  app.append(
    h('div', { class: 'page-header' },
      h('div', {},
        h('div', { class: 'page-title' }, '订单明细'),
        h('div', { class: 'page-sub' }, '基地：' + base + '  ·  只读视图'),
      ),
      h('div', { class: 'card-actions' }, h('button', { class: 'btn btn-primary', onclick: doExport }, '导出 Excel'))
    ),
    h('div', { class: 'card' },
      h('div', { class: 'card-body' },
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group', style: { maxWidth: 180 } }, h('label', {}, '月份'), monthSel),
          h('div', { class: 'form-group' }, h('label', {}, '老师姓名'), nameInput),
        )
      )
    ),
    pageBox
  );
  render();
}
