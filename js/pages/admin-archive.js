/** 后台 - 归档管理 */
import { h, $, clear, fmtMoney, toast, modal, dangerConfirm, fmtDate } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { Archive, Orders, Logs } from '../store.js';

export function pageAdminArchive() {
  const root = h('div', {});
  adminLayout('归档管理', root);

  const listBox = h('div', {});

  function draw() {
    clear(listBox);
    const months = Archive.list();

    listBox.append(
      h('div', { class: 'card', style: { marginBottom: 14 } },
        h('div', { class: 'card-body' },
          h('div', { class: 'alert alert-info' },
            '按月度归档锁定：锁定后该月订单不可增删改，架构调整不影响锁定月业绩归属。跨月调整时各月份独立计算。'
          ),
          h('div', { class: 'gap-8', style: { marginTop: 8 } },
            h('button', { class: 'btn btn-primary', onclick: addMonth }, '➕ 新增月份')
          )
        )
      ),
      h('div', { class: 'card' },
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('div', { class: 'table-wrap' },
            h('table', {},
              h('thead', {}, h('tr', {}, h('th', {}, '月份'), h('th', {}, '订单数'), h('th', {}, '状态'), h('th', {}, '锁定人'), h('th', {}, '锁定时间'), h('th', {}, '操作'))),
              h('tbody', {}, months.map(a => {
                const orders = Orders.byMonth(a.month);
                const total = orders.reduce((s, o) => s + o.amount, 0);
                return h('tr', {},
                  h('td', {}, h('b', {}, a.month)),
                  h('td', {}, `${orders.length} 条 · ${fmtMoney(total)}`),
                  h('td', {}, a.locked ? h('span', { class: 'badge badge-warn' }, '🔒 已锁定') : h('span', { class: 'badge badge-success' }, '可编辑')),
                  h('td', {}, a.locked_by || '-'),
                  h('td', {}, fmtDate(a.locked_at)),
                  h('td', {},
                    a.locked
                      ? h('button', { class: 'btn btn-sm btn-link', style: { color: 'var(--danger)' }, onclick: () => doUnlock(a) }, '🔓 解锁')
                      : h('button', { class: 'btn btn-sm btn-link', onclick: () => doLock(a) }, '🔒 锁定')
                  )
                );
              }))
            )
          )
        )
      )
    );
  }

  root.append(listBox);
  draw();

  function addMonth() {
    modal({
      title: '新增月份',
      body: h('div', {},
        h('div', { class: 'form-group', style: { marginBottom: 0 } },
          h('label', {}, '月份'),
          h('input', { type: 'month', id: 'new-month', style: { padding: '7px 10px', border: '1px solid var(--line-strong)', borderRadius: '6px', width: '100%' } })
        )
      ),
      onOk: () => {
        const m = document.getElementById('new-month').value;
        if (!m) { toast('请选月份', 'warn'); return false; }
        Archive.ensureMonth(m);
        Logs.add({ module: '归档', action: '新增月份', description: `新增可编辑月份：${m}` });
        draw();
      }
    });
  }

  async function doLock(a) {
    const ok = await modal({
      title: '锁定月份 ' + a.month + '？',
      body: h('div', {},
        h('div', { class: 'alert alert-warn' }, '🔒 锁定后该月订单将冻结，不可再增删改。'),
        h('div', { class: 'divider' }),
        h('div', {}, '当前月份订单数：' + Orders.byMonth(a.month).length),
        h('div', { class: 'muted', style: { fontSize: 12, marginTop: 6 } }, '架构调整将不影响锁定月归属。解锁需再次高危确认。')
      ),
      okText: '确认锁定'
    });
    if (!ok) return;
    const r = Archive.lock(a.month, Auth.session()?.username);
    if (r.ok) { Logs.add({ module: '归档', action: '锁定', description: `锁定月份 ${a.month}` }); toast('已锁定', 'success'); draw(); }
    else toast(r.reason, 'warn');
  }

  async function doUnlock(a) {
    const ok = await dangerConfirm(
      '高危操作：解锁已锁定月份 ' + a.month + '？',
      h('div', {},
        h('div', { class: 'alert alert-danger' }, '⚠️ 解锁后架构调整将重新影响该月业绩归属！'),
        h('div', { class: 'divider' }),
        h('div', {}, '建议仅在：发现数据错误、需补录遗漏订单、架构误锁定 时才使用。'),
        h('div', { class: 'divider' }),
        h('div', {}, '解锁行为将被红色高亮记录于审计日志中。')
      ).outerHTML
    );
    if (!ok) return;
    const r = Archive.unlock(a.month, Auth.session()?.username);
    if (r.ok) {
      Logs.add({ module: '归档', action: '解锁', description: `解锁月份 ${a.month}`, risk: true });
      toast('已解锁，请谨慎操作', 'success'); draw();
    } else toast(r.reason, 'warn');
  }
}

// Auth 引用（顶层需要）
import { Auth } from '../store.js';
