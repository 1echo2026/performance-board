/** 后台 - 架构管理 */
import { h, $, clear, fmtMoney, toast, modal, download, toCSV } from '../ui.js';
import { adminLayout } from './admin-layout.js';
import { Structure, Logs } from '../store.js';
import { rollupMonths, allMonths } from '../engine.js';

export function pageAdminStructure() {
  const root = h('div', {});
  adminLayout('架构管理', root);

  const list = Structure.list();
  const treeRoot = h('div', { id: 'struct-tree' });

  function draw() {
    clear(treeRoot);
    const all = Structure.list();
    const byId = new Map(all.map(p => [p.id, p]));
    const months = allMonths();
    const rollup = new Map(rollupMonths(months).map(r => [r.id, r]));

    function makeNode(id) {
      const n = byId.get(id);
      if (!n) return null;
      const kids = all.filter(p => p.parent_id === id);
      const perf = rollup.get(id);
      return h('div', { class: 'tree-node', style: { marginLeft: 12 } },
        h('div', { class: 'tree-head' },
          h('span', { class: 'tree-toggle' }, kids.length ? '▼' : '·'),
          h('span', { class: 'tree-role ' + roleCls(n.role) }, n.role),
          h('span', { class: 'tree-name' }, n.name),
          h('span', { class: 'muted', style: { marginLeft: 10, fontSize: 12 } }, n.base_name),
          perf ? h('span', { class: 'tree-sub' }, h('span', { class: 'amount', style: { fontSize: 12.5 } }, fmtMoney(perf.team_perf) + ' 团队')) : null,
          h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
            h('button', { class: 'btn btn-sm btn-link', onclick: () => addChild(n) }, '➕ 添加下属'),
            h('button', { class: 'btn btn-sm btn-link', onclick: () => editPerson(n) }, '编辑'),
            h('button', { class: 'btn btn-sm btn-link', style: { color: 'var(--danger)' }, onclick: () => delPerson(n) }, '删除')
          )
        ),
        ...kids.map(k => makeNode(k.id))
      );
    }

    const roots = all.filter(p => !p.parent_id);
    roots.forEach(r => treeRoot.appendChild(makeNode(r.id)));
  }

  root.append(
    h('div', { class: 'card', style: { marginBottom: 14 } },
      h('div', { class: 'card-actions', style: { padding: '14px 18px' } },
        h('button', { class: 'btn btn-primary', onclick: () => addTop() }, '➕ 新增基地负责人'),
        h('button', { class: 'btn', onclick: showImport }, '📥 批量导入'),
        h('button', { class: 'btn', onclick: doExport }, '📤 导出架构'),
        h('button', { class: 'btn', onclick: () => { toast('已手动重算业绩', 'success'); draw(); } }, '🔄 手动重算业绩')
      )
    ),
    treeRoot
  );
  draw();

  // ========== 动作 ==========
  function addTop() { editPerson(null, '基地负责人', null); }

  function addChild(parent) {
    const role = parent.role === '基地负责人' ? '主管' : parent.role === '主管' ? '组长' : parent.role === '组长' ? '老师' : null;
    if (!role) { toast('老师不可再添加下属', 'warn'); return; }
    editPerson(null, role, parent);
  }

  function editPerson(person, forcedRole, forcedParent) {
    const all = Structure.list();
    const bases = [...new Set(all.map(p => p.base_name))];

    const isEdit = !!person;
    const nameEl = h('input', { type: 'text', value: person?.name || '', placeholder: '姓名' });
    const roleEl = h('select', {}, ['基地负责人', '主管', '组长', '老师'].map(r =>
      h('option', { value: r, selected: (forcedRole || person?.role) === r ? '' : undefined }, r)
    ));
    if (forcedRole || person?.role) { roleEl.disabled = true; }

    const parentOptions = [h('option', { value: '' }, '（无，基地负责人）')];
    all.filter(p => (forcedRole || person?.role) === '基地负责人' ? !p.parent_id : true).forEach(p => {
      const canBeParent = (forcedRole || person?.role) === '主管' && p.role === '基地负责人'
        || (forcedRole || person?.role) === '组长' && p.role === '主管'
        || (forcedRole || person?.role) === '老师' && p.role === '组长';
      if (canBeParent) parentOptions.push(h('option', { value: p.id, selected: (person?.parent_id || forcedParent?.id) === p.id ? '' : undefined }, `${p.name}（${p.role} · ${p.base_name}）`));
    });
    const parentEl = h('select', {}, ...parentOptions);
    if (forcedParent) parentEl.value = forcedParent.id;
    else if (person?.parent_id) parentEl.value = person.parent_id; // 编辑时预填充原上级
    else if (person?.role === '基地负责人') parentEl.value = ''; // 基地负责人无上级

    const baseEl = h('select', {},
      bases.map(b => h('option', { value: b, selected: person?.base_name === b ? '' : undefined }, b)),
      !person ? h('option', { value: '', selected: !bases.length ? '' : undefined }, '新基地...') : null
    );
    const newBaseEl = h('input', { type: 'text', placeholder: '如选"新基地"则填这里' });

    modal({
      title: isEdit ? '编辑人员' : '新增人员',
      body: h('div', {},
        h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '姓名 <span class="req">*</span>'), nameEl),
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '岗位 <span class="req">*</span>'), roleEl),
          h('div', { class: 'form-group' }, h('label', {}, '上级（按岗位联动）'), parentEl),
        ),
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '所属基地 <span class="req">*</span>'), baseEl),
          baseEl.value === '' ? h('div', { class: 'form-group' }, h('label', {}, '新基地名称'), newBaseEl) : null
        )
      ),
      onOk: () => {
        const name = nameEl.value.trim();
        if (!name) { toast('请填姓名', 'warn'); return false; }
        const role = roleEl.value;
        const parent_id = parentEl.value || null;
        let base_name = baseEl.value;
        if (!base_name) base_name = newBaseEl.value.trim();
        if (!base_name) { toast('请填基地', 'warn'); return false; }

        if (isEdit) {
          const before = { ...person };
          const updated = Structure.update(person.id, { name, role, parent_id, base_name });
          Logs.add({ module: '架构', action: '编辑', description: `人员 ${before.name} → ${name}（${role} · ${base_name}），上级 ${before.parent_id} → ${parent_id || '（无）'}`, detail: { before, after: updated } });
        } else {
          const created = Structure.add({ name, role, parent_id, base_name });
          Logs.add({ module: '架构', action: '新增', description: `新增 ${role}：${name}（${base_name}）`, detail: created });
        }
        toast('保存成功', 'success');
        draw();
      }
    });
  }

  async function delPerson(person) {
    const ok = await modal({
      title: '确认删除？',
      danger: true,
      body: h('div', {}, `人员：${person.name}（${person.role} · ${person.base_name}）`),
      okText: '确认删除'
    });
    if (!ok) return;
    const r = Structure.remove(person.id);
    if (r.error) { toast(r.error, 'error'); return; }
    Logs.add({ module: '架构', action: '删除', description: `删除 ${person.role}：${person.name}`, detail: r });
    toast('已删除', 'success');
    draw();
  }

  function showImport() {
    // 简化：JSON 导入导出
    const fileInput = h('input', { type: 'file', accept: '.json,.csv', style: { display: 'none' } });
    document.body.appendChild(fileInput);
    modal({
      title: '批量导入架构',
      body: h('div', {},
        h('div', { class: 'alert alert-info' },
          '导入格式：JSON 数组，每项 {name, role, parent_name(上级姓名), base_name}'
        ),
        h('div', { class: 'gap-8' },
          h('button', { class: 'btn btn-primary', onclick: () => fileInput.click() }, '📂 选择 JSON 文件'),
          h('button', { class: 'btn', onclick: () => download('架构导入示例.json', JSON.stringify([
            { name: '张三负责人', role: '基地负责人', parent_name: '', base_name: '基地A' },
            { name: '张主管', role: '主管', parent_name: '张三负责人', base_name: '基地A' },
            { name: '王组长', role: '组长', parent_name: '张主管', base_name: '基地A' },
            { name: '李老师', role: '老师', parent_name: '王组长', base_name: '基地A' }
          ], null, 2)) }, '📄 下载模板')
        )
      ),
      okText: '确认导入',
      onOk: () => {
        toast('请先选择文件', 'warn'); return false;
      }
    });
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const arr = JSON.parse(ev.target.result);
          // 简化：覆盖
          let ok = 0;
          arr.forEach(item => {
            const parent = item.parent_name ? Structure.list().find(p => p.name === item.parent_name) : null;
            Structure.add({ name: item.name, role: item.role, parent_id: parent?.id || null, base_name: item.base_name });
            ok++;
          });
          Logs.add({ module: '架构', action: '批量导入', description: `导入 ${ok} 人` });
          toast(`导入 ${ok} 人`, 'success');
          draw();
        } catch (err) { toast('解析失败：' + err.message, 'error'); }
      };
      reader.readAsText(f);
    });
  }

  function doExport() {
    const arr = Structure.list().map(p => ({ id: p.id, name: p.name, role: p.role, parent: p.parent_id ? Structure.byId(p.parent_id)?.name : '', base_name: p.base_name }));
    download('架构导出_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(arr, null, 2), 'application/json');
    Logs.add({ module: '架构', action: '导出', description: `导出 ${arr.length} 人` });
    toast('导出成功', 'success');
  }
}

function roleCls(r) {
  return r === '基地负责人' ? 'president' : r === '主管' ? 'manager' : r === '组长' ? 'leader' : 'teacher';
}
