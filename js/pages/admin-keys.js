/** 后台 - 基地密钥管理 */
import { h, $, clear, toast, modal } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { BaseKey, Logs, Structure } from '../store.js';

export function pageAdminKeys() {
  const root = h('div', {});
  adminLayout('基地密钥管理', root);

  const listBox = h('div', {});

  function draw() {
    clear(listBox);
    const keys = BaseKey.list();
    const allBases = Structure.allBases();
    const missingBases = allBases.filter(b => !keys.some(k => k.base_name === b));

    listBox.append(
      h('div', { class: 'card', style: { marginBottom: 14 } },
        h('div', { class: 'card-body' },
          h('div', { class: 'alert alert-info' },
            '每个基地一个访问密钥。基地人员在前台输入密钥后可查看本基地名单/组织/订单；总览大盘无需密钥。'
          )
        )
      ),
      h('div', { class: 'card' },
        h('div', { class: 'card-header' },
          h('h3', {}, '已配置密钥'),
          h('button', { class: 'btn btn-primary btn-sm', onclick: () => addKey() }, '➕ 新增密钥')
        ),
        h('div', { class: 'card-body', style: { padding: 0 } },
          h('div', { class: 'table-wrap' },
            h('table', {},
              h('thead', {}, h('tr', {}, h('th', {}, '基地'), h('th', {}, '访问密钥'), h('th', {}, '操作'))),
              h('tbody', {},
                keys.length ? keys.map(k => h('tr', {},
                  h('td', { style: { fontWeight: 500 } }, k.base_name),
                  h('td', {},
                    h('input', { type: 'password', value: k.access_key, readonly: true, id: 'k_' + k.id, style: { maxWidth: 200, fontFamily: 'var(--mono)' } }),
                    h('button', { class: 'btn btn-sm btn-ghost', onclick: () => {
                      const el = document.getElementById('k_' + k.id);
                      el.type = el.type === 'password' ? 'text' : 'password';
                    } }, '👁')
                  ),
                  h('td', {},
                    h('div', { class: 'gap-8' },
                      h('button', { class: 'btn btn-sm btn-link', onclick: () => editKey(k) }, '修改'),
                      h('button', { class: 'btn btn-sm btn-link', style: { color: 'var(--danger)' }, onclick: () => delKey(k) }, '删除')
                    )
                  )
                )) : h('tr', {}, h('td', { colspan: 3, style: { textAlign: 'center', padding: '32px', color: '#9ca3af' } }, '暂无密钥，请新增'))
              )
            )
          )
        )
      )
    );
  }

  root.append(listBox);
  draw();

  function addKey() { editKey(null); }

  function editKey(k) {
    const all = Structure.allBases();
    const baseEl = h('select', {},
      all.map(b => h('option', { value: b, selected: k?.base_name === b ? '' : undefined }, b)),
      h('option', { value: '', selected: !all.length ? '' : undefined }, '新基地...')
    );
    const newBaseEl = h('input', { type: 'text', placeholder: '如选新基地' });
    const keyEl = h('input', { type: 'text', value: k?.access_key || '', placeholder: '请输入新密钥' });

    modal({
      title: k ? '修改基地密钥' : '新增基地密钥',
      body: h('div', {},
        h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '基地名称 <span class="req">*</span>'), baseEl),
        h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '新基地（如上面选"新基地"）'), newBaseEl),
        h('div', { class: 'form-group' }, h('label', {}, '访问密钥 <span class="req">*</span>'), keyEl)
      ),
      onOk: () => {
        let base = baseEl.value; if (!base) base = newBaseEl.value.trim();
        const key = keyEl.value.trim();
        if (!base || !key) { toast('必填项不完整', 'warn'); return false; }
        BaseKey.upsert(base, key);
        Logs.add({ module: '基地密钥', action: k ? '修改' : '新增', description: `${base} 的访问密钥已${k ? '修改' : '新增'}` });
        toast('保存成功', 'success');
        draw();
      }
    });
  }

  async function delKey(k) {
    const ok = await modal({ title: '删除密钥', body: h('div', {}, `确认删除 ${k.base_name} 的访问密钥？删除后该基地人员将无法在前台查看本基地数据。`), okText: '确认删除' });
    if (!ok) return;
    BaseKey.remove(k.id);
    Logs.add({ module: '基地密钥', action: '删除', description: `删除 ${k.base_name} 的访问密钥` });
    toast('已删除', 'success');
    draw();
  }
}
