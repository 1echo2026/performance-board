/** 后台 - 订单管理 */
import { h, $, clear, fmtMoney, toast, modal, dangerConfirm, fmtDate, download, toCSV } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { Orders, Structure, Archive, Logs } from '../store.js';

const state = { page: 1, pageSize: 20, month: '', name: '' };

export function pageAdminOrders() {
  const root = h('div', {});
  adminLayout('订单管理', root);

  const monthSel = h('input', { type: 'month', value: state.month, onchange: e => { state.month = e.target.value; state.page = 1; redraw(); } });
  const nameInput = h('input', { type: 'text', placeholder: '老师姓名', value: state.name, oninput: e => { state.name = e.target.value; state.page = 1; redraw(); } });

  const tableWrap = h('div', { style: { marginTop: 16 } });

  function redraw() {
    const list = Orders.list({ month: state.month || undefined, seller_name: state.name || undefined });
    const totalPages = Math.max(1, Math.ceil(list.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const sliced = list.slice((state.page - 1) * state.pageSize, state.page * state.pageSize);

    clear(tableWrap);
    tableWrap.append(
      h('div', { class: 'card' },
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('div', { class: 'table-wrap' },
            h('table', {},
              h('thead', {}, h('tr', {},
                h('th', {}, '订单号'), h('th', {}, '销售'), h('th', { style: { textAlign: 'right' } }, '金额'),
                h('th', {}, '月份'), h('th', {}, '备注'), h('th', {}, '基地'), h('th', {}, '状态'), h('th', {}, '创建时间'), h('th', {}, '操作')
              )),
              h('tbody', {}, sliced.length ? sliced.map(o => {
                const locked = Archive.isLocked(o.month);
                const t = Structure.byRole('老师').find(x => x.name === o.seller_name);
                return h('tr', { class: locked ? 'locked' : '' },
                  h('td', { class: 'mono' }, o.id),
                  h('td', {}, o.seller_name + (t ? '' : h('span', { class: 'badge badge-danger', style: { marginLeft: 6, fontSize: 10 } }, '无效'))),
                  h('td', { class: 'amount' }, fmtMoney(o.amount)),
                  h('td', {}, o.month),
                  h('td', { class: 'ellipsis', style: { maxWidth: 160 } }, o.remark || '-'),
                  h('td', {}, t?.base_name || '-'),
                  h('td', {}, locked ? h('span', { class: 'badge badge-warn' }, '已锁定') : h('span', { class: 'badge badge-success' }, '可编辑')),
                  h('td', { class: 'muted' }, fmtDate(o.created_at)),
                  h('td', {},
                    locked ? h('span', { class: 'muted', style: { fontSize: 12 } }, '-') :
                    h('div', { class: 'gap-8' },
                      h('button', { class: 'btn btn-sm btn-link', onclick: () => editOrder(o) }, '编辑'),
                      h('button', { class: 'btn btn-sm btn-link', style: { color: 'var(--danger)' }, onclick: () => delOrder(o) }, '删除')
                    )
                  )
                );
              }) : h('tr', {}, h('td', { colspan: 9, style: { textAlign: 'center', padding: '32px', color: '#9ca3af' } }, '无订单'))
            )
          )
        )
      ),
      // 分页
      h('div', { class: 'flex-between', style: { marginTop: 12 } },
        h('span', { class: 'muted' }, `共 ${list.length} 条 · 第 ${state.page}/${totalPages} 页`),
        h('div', { class: 'gap-8' },
          h('button', { class: 'btn btn-sm', disabled: state.page <= 1, onclick: () => { state.page--; redraw(); } }, '上一页'),
          h('button', { class: 'btn btn-sm', disabled: state.page >= totalPages, onclick: () => { state.page++; redraw(); } }, '下一页'),
        )
      )
    );
  }

  // --------- 动作按钮 ---------
  root.append(
    h('div', { class: 'card', style: { marginBottom: 14 } },
      h('div', { class: 'card-body' },
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group', style: { maxWidth: 200 } }, h('label', {}, '月份筛选'), monthSel),
          h('div', { class: 'form-group' }, h('label', {}, '老师姓名'), nameInput),
          h('div', { style: { alignSelf: 'flex-end', marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { class: 'btn btn-primary', onclick: addOrder }, '➕ 新增订单'),
            h('button', { class: 'btn', onclick: showImport }, '📥 批量导入'),
            h('button', { class: 'btn', onclick: () => {
              const list = Orders.list({ month: state.month || undefined, seller_name: state.name || undefined });
              download('订单导出_' + new Date().toISOString().slice(0, 10) + '.csv', toCSV(list, [
                { label: '订单号', key: 'id' }, { label: '销售姓名', key: 'seller_name' },
                { label: '金额', key: 'amount' }, { label: '月份', key: 'month' }, { label: '备注', key: 'remark' }
              ]));
              toast('导出成功', 'success');
            } }, '📤 导出'),
            h('button', { class: 'btn btn-danger', onclick: clearUnlocked }, '🗑 清空未锁定月')
          )
        )
      )
    ),
    tableWrap
  );

  redraw();

  // ========= 函数 =========
  function addOrder() { editOrder(null); }

  function editOrder(order) {
    const teachers = Structure.byRole('老师').map(t => h('option', { value: t.name }, t.name + '（' + t.base_name + '）'));
    const nameEl = h('select', { id: 'ed-seller', style: { width: '100%', padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: '6px' } },
      order ? teachers : [h('option', { value: '' }, '请选择老师'), ...teachers]
    );
    const amountEl = h('input', { type: 'number', id: 'ed-amount', placeholder: '金额', value: order?.amount || '' });
    const monthEl = h('input', { type: 'month', id: 'ed-month', value: order?.month || new Date().toISOString().slice(0, 7) });
    const remarkEl = h('textarea', { id: 'ed-remark', placeholder: '备注', rows: 2 }, order?.remark || '');

    const locked = order ? Archive.isLocked(order.month) : false;
    if (locked) {
      [amountEl, monthEl, remarkEl].forEach(el => el.disabled = true);
    }

    modal({
      title: order ? '编辑订单' : '新增订单',
      size: 'md',
      body: h('div', {},
        locked ? h('div', { class: 'alert alert-warn' }, '该订单所属月份已锁定，仅允许编辑备注') : null,
        h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '销售老师 <span class="req">*</span>'), nameEl),
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '业绩金额 <span class="req">*</span>'), amountEl),
          h('div', { class: 'form-group' }, h('label', {}, '月份 <span class="req">*</span>'), monthEl),
        ),
        h('div', { class: 'form-group' }, h('label', {}, '备注'), remarkEl)
      ),
      onOk: () => {
        const seller = nameEl.value;
        const amount = Number(amountEl.value);
        const month = monthEl.value;
        if (!seller || !amount || !month) { toast('必填项不完整', 'warn'); return false; }
        if (amount <= 0) { toast('金额必须大于 0', 'warn'); return false; }
        if (!/^\d{4}-\d{2}$/.test(month)) { toast('月份格式错误', 'warn'); return false; }
        if (Archive.isLocked(month) && order && month !== order.month) { toast('目标月份已锁定', 'error'); return false; }

        if (order) {
          const before = { ...order };
          const patch = { remark: remarkEl.value };
          if (!Archive.isLocked(order.month)) { patch.amount = amount; }
          const updated = Orders.update(order.id, patch);
          Logs.add({
            module: '订单', action: '编辑',
            description: `订单 ${order.id} 由 ${order.seller_name} 的 ${fmtMoney(before.amount)} → ${fmtMoney(patch.amount)}（月份 ${order.month}）`,
            detail: { before, after: updated }
          });
        } else {
          const created = Orders.add({ seller_name: seller, amount, month, remark: remarkEl.value });
          Logs.add({ module: '订单', action: '新增', description: `订单 ${created.id}：${seller} · ${fmtMoney(amount)} · ${month}` });
        }
        toast('保存成功', 'success');
        redraw();
      }
    });
  }

  async function delOrder(order) {
    if (Archive.isLocked(order.month)) { toast('该订单所属月份已锁定，无法删除', 'warn'); return; }
    const ok = await modal({
      title: '确认删除订单？',
      danger: true,
      body: h('div', {},
        h('div', {}, `订单号：${order.id}`),
        h('div', {}, `销售：${order.seller_name} · 金额：${fmtMoney(order.amount)} · 月份：${order.month}`),
        h('div', { class: 'muted', style: { marginTop: 10, fontSize: 12 } }, '删除后将自动重算该月业绩汇总。'),
      ),
      okText: '确认删除'
    });
    if (!ok) return;
    const removed = Orders.remove(order.id);
    Logs.add({ module: '订单', action: '删除', description: `订单 ${order.id} 已删除`, detail: { removed } });
    toast('已删除', 'success');
    redraw();
  }

  async function clearUnlocked() {
    const ok = await dangerConfirm('清空所有未锁定月份订单？',
      h('div', {},
        h('div', {}, '⚠️ 此操作将永久删除所有未锁定月份的订单数据，不可恢复！'),
        h('div', { class: 'divider' }),
        h('div', {}, '已锁定月份的订单不受影响。')
      ).outerHTML
    );
    if (!ok) return;
    const n = Orders.clearUnlocked();
    Logs.add({ module: '订单', action: '清空未锁定', description: `已清空 ${n} 条未锁定月份订单`, risk: true });
    toast(`已清空 ${n} 条订单`, 'success');
    redraw();
  }

  function showImport() {
    const fileInput = h('input', { type: 'file', accept: '.csv,.tsv', style: { display: 'none' } });
    let result;

    function parseCSV(text) {
      const rows = text.trim().split(/\r?\n/).slice(1);
      return rows.map(r => r.split(',').map(c => c.replace(/^"|"$/g, '').trim()));
    }

    modal({
      title: '批量导入订单',
      size: 'lg',
      body: h('div', {},
        h('div', { class: 'alert alert-info' },
          'CSV 表头：销售姓名, 金额, 月份, 备注  ——  注意"销售姓名"必须与架构老师姓名完全一致'
        ),
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group', style: { flexDirection: 'column', display: 'flex' } },
            h('label', {}, '选择文件 (.csv)'),
            h('button', { class: 'btn', style: { alignSelf: 'flex-start' }, onclick: () => fileInput.click() }, '📂 选择文件')
          ),
          h('button', { class: 'btn', style: { alignSelf: 'center' }, onclick: () => download('订单导入模板.csv', '销售姓名,金额,月份,备注\n张三,5000,2026-05,示例订单\n李四,8800,2026-05,追加订单') }, '📄 下载模板')
        ),
        h('div', { id: 'import-preview', style: { marginTop: 12 } })
      ),
      okText: '开始导入',
      onOk: () => {
        if (!result) { toast('请先选择文件', 'warn'); return false; }
        const r = Orders.bulkImport(result);
        toast(`导入完成：成功 ${r.ok} 条，失败 ${r.fail.length} 条`, r.fail.length ? 'warn' : 'success');
        if (r.fail.length) {
          const csv = toCSV(r.fail, [{ label: '行号', key: 'row' }, { label: '失败原因', key: 'reason' }]);
          download('导入失败明细.csv', csv);
        }
        Logs.add({ module: '订单', action: '批量导入', description: `导入 ${r.ok} 条，失败 ${r.fail.length} 条` });
        redraw();
      }
    });

    document.body.appendChild(fileInput);
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const rows = parseCSV(ev.target.result);
        result = rows.map(r => ({ seller_name: r[0], amount: Number(r[1]), month: r[2], remark: r[3] || '' }));
        const prev = document.getElementById('import-preview');
        clear(prev);
        prev.append(h('div', {},
          h('b', {}, `预览 ${result.length} 条记录`),
          h('div', { class: 'table-wrap', style: { marginTop: 6 } },
            h('table', {},
              h('thead', {}, h('tr', {}, h('th', {}, '销售'), h('th', { style: { textAlign: 'right' } }, '金额'), h('th', {}, '月份'), h('th', {}, '备注'))),
              h('tbody', {}, result.slice(0, 10).map(r => h('tr', {}, h('td', {}, r.seller_name), h('td', { class: 'amount' }, fmtMoney(r.amount)), h('td', {}, r.month), h('td', {}, r.remark))))
            )
          )
        ));
      };
      reader.readAsText(f, 'utf-8');
    });
  }
}
