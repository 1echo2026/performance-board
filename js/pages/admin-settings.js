/** 后台 - 系统设置 */
import { h, $, clear, toast, modal, dangerConfirm } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { Logs, Auth, _debug, resetState } from '../store.js';
import { download } from '../ui.js';

export function pageAdminSettings() {
  const root = h('div', {});
  adminLayout('系统设置', root);

  const settings = Logs.settings();
  const retentionEl = h('select', {},
    [
      { v: 'permanent', t: '永久保存' },
      { v: '24months', t: '24 个月超期归档' },
      { v: '12months', t: '12 个月定期彻底删除 ⚠️' },
    ].map(o => h('option', { value: o.v, selected: settings.log_retention === o.v ? '' : undefined }, o.t))
  );

  const adminsBox = h('div', {});

  function drawAdmins() {
    clear(adminsBox);
    const list = Auth.admins();
    adminsBox.append(
      h('div', { class: 'card' },
        h('div', { class: 'card-header' }, h('h3', {}, '管理员账号'), h('button', { class: 'btn btn-primary btn-sm', onclick: addAdmin }, '➕ 新增管理员')),
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('table', {},
            h('thead', {}, h('tr', {}, h('th', {}, '账号'), h('th', {}, '创建时间'), h('th', {}, '操作'))),
            h('tbody', {}, list.map(a => h('tr', {},
              h('td', { style: { fontWeight: 500 } }, a.username),
              h('td', {}, a.created_at ? new Date(a.created_at).toLocaleString('zh-CN') : '-'),
              h('td', {},
                h('div', { class: 'gap-8' },
                  h('button', { class: 'btn btn-sm btn-link', onclick: () => resetPwd(a.username) }, '重置密码'),
                  list.length > 1
                    ? h('button', { class: 'btn btn-sm btn-link', style: { color: 'var(--danger)' }, onclick: () => delAdmin(a.username) }, '删除')
                    : h('span', { class: 'muted', style: { fontSize: 12 } }, '默认保留')
                )
              )
            )))
          )
        )
      )
    );
  }

  root.append(
    h('div', { class: 'card', style: { marginBottom: 14 } },
      h('div', { class: 'card-header' }, h('h3', {}, '日志存储策略')),
      h('div', { class: 'card-body' },
        h('div', { class: 'form-group' }, h('label', {}, '保留策略'), retentionEl),
        h('div', { class: 'muted', style: { fontSize: 12, marginTop: 6 } },
          '⚠️ 定期彻底删除意味着历史审计痕迹将永久丢失；生产环境建议选「永久保存」或「超期归档」。'
        ),
        h('button', { class: 'btn btn-primary', style: { marginTop: 10 }, onclick: () => {
          Logs.setSettings({ log_retention: retentionEl.value });
          Logs.add({ module: '系统设置', action: '修改', description: `日志存储策略 → ${retentionEl.options[retentionEl.selectedIndex].textContent}` });
          toast('已保存', 'success');
        } }, '保存设置')
      )
    ),
    adminsBox,
    h('div', { class: 'card', style: { marginTop: 14 } },
      h('div', { class: 'card-header' }, h('h3', {}, '数据备份 / 重置')),
      h('div', { class: 'card-body' },
        h('div', { class: 'gap-8', flexWrap: 'wrap' },
          h('button', { class: 'btn', onclick: () => {
            const json = _debug.exportState();
            download('系统备份_' + new Date().toISOString().slice(0, 10) + '.json', json, 'application/json');
            Logs.add({ module: '系统设置', action: '导出', description: '导出全量数据备份' });
            toast('已导出', 'success');
          } }, '📤 导出全量备份'),
          h('button', { class: 'btn btn-danger', onclick: async () => {
            const ok = await dangerConfirm('重置系统到初始演示数据？',
              '⚠️ 此操作会清空所有订单、架构、日志等数据，恢复为初始演示状态。仅用于测试。'
            );
            if (!ok) return;
            resetState();
            Logs.add({ module: '系统设置', action: '重置', description: '重置系统到初始状态', risk: true });
            toast('已重置', 'success');
          } }, '🗑 重置为演示数据')
        )
      )
    )
  );

  drawAdmins();

  // ========== 动作 ==========
  function addAdmin() {
    const u = h('input', { type: 'text', placeholder: '账号' });
    const p = h('input', { type: 'password', placeholder: '初始密码' });
    modal({
      title: '新增管理员',
      body: h('div', {},
        h('div', { class: 'form-group' }, h('label', {}, '账号'), u),
        h('div', { class: 'form-group' }, h('label', {}, '初始密码'), p)
      ),
      onOk: () => {
        const un = u.value.trim(), pw = p.value;
        if (!un || !pw) { toast('必填', 'warn'); return false; }
        const r = Auth.addAdmin(un, pw);
        if (r?.error) { toast(r.error, 'error'); return false; }
        Logs.add({ module: '系统设置', action: '新增管理员', description: `新增账号 ${un}` });
        toast('已新增', 'success'); drawAdmins();
      }
    });
  }

  function resetPwd(username) {
    const p = h('input', { type: 'password', placeholder: '新密码' });
    const p2 = h('input', { type: 'password', placeholder: '再次确认' });
    modal({
      title: '重置密码：' + username,
      body: h('div', {},
        h('div', { class: 'form-group' }, h('label', {}, '新密码'), p),
        h('div', { class: 'form-group' }, h('label', {}, '再次确认'), p2)
      ),
      onOk: () => {
        if (p.value !== p2.value) { toast('两次输入不一致', 'warn'); return false; }
        const r = Auth.resetPassword(username, p.value);
        if (r?.error) { toast(r.error, 'error'); return false; }
        Logs.add({ module: '系统设置', action: '密码重置', description: `重置账号 ${username} 的密码` });
        toast('已重置', 'success');
      }
    });
  }

  async function delAdmin(username) {
    const ok = await modal({ title: '删除管理员', body: `确认删除账号 ${username}？`, okText: '删除' });
    if (!ok) return;
    Auth.removeAdmin(username);
    Logs.add({ module: '系统设置', action: '删除管理员', description: `删除账号 ${username}` });
    toast('已删除', 'success'); drawAdmins();
  }
}
