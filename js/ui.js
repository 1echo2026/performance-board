/** DOM / Toast / Modal / 格式化 工具 */

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class' || k === 'className') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset' && v) Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else if (v === false || v == null) { /* skip */ }
    else el.setAttribute(k, v);
  }
  children.forEach(c => {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(x => el.appendChild(x instanceof Node ? x : document.createTextNode(String(x))));
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  });
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return '¥' + v.toLocaleString('zh-CN', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}
export function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
export function fmtMonth(m) { return m || ''; }

// Toast
let toastSeq = 0;
export function toast(msg, type = 'info', ms = 2500) {
  const host = $('#toast-host') || document.body.appendChild(h('div', { id: 'toast-host' }));
  const t = h('div', { class: 'toast ' + type, 'role': 'status' }, msg);
  host.appendChild(t);
  const id = ++toastSeq;
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; t.style.transition = '.2s'; setTimeout(() => t.remove(), 200); }, ms);
}

// Modal
export function modal({ title = '', body, onOk, okText = '确定', cancelText = '取消', danger = false, size = '' } = {}) {
  return new Promise(resolve => {
    const host = $('#modal-host') || document.body.appendChild(h('div', { id: 'modal-host' }));
    const mask = h('div', { class: 'modal-mask' });
    const modalEl = h('div', { class: 'modal ' + (danger ? 'danger ' : '') + size },
      h('div', { class: 'modal-head' },
        h('h3', {}, title),
        h('button', { class: 'modal-close', onclick: () => close(null) }, '✕')
      ),
      h('div', { class: 'modal-body' }, typeof body === 'string' ? (() => { const d = h('div'); d.innerHTML = body; return d; })() : body),
      h('div', { class: 'modal-foot' },
        h('button', { class: 'btn', onclick: () => close(null) }, cancelText),
        onOk ? h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-primary'), onclick: () => { const r = onOk ? onOk() : true; if (r !== false) close(r); } }, okText) : null
      )
    );
    mask.appendChild(modalEl);
    host.appendChild(mask);
    function close(result) { mask.remove(); resolve(result); }
    mask.addEventListener('click', e => { if (e.target === mask) close(null); });
  });
}

/** 高危二次确认 */
export async function dangerConfirm(title, desc) {
  const ok = await modal({
    title,
    danger: true,
    size: 'lg',
    body: h('div', {},
      h('div', { class: 'alert alert-danger' }, '⚠️ 高危操作！'),
      h('div', { class: 'divider' }),
      h('div', {}, desc),
      h('div', { class: 'divider' }),
      h('div', { class: 'muted' }, '此操作将被记录到审计日志中。'),
      h('div', { style: { marginTop: '14px', fontWeight: 500, color: 'var(--danger)' } }, '请再次输入 "确认操作" 以继续：'),
      h('input', { class: 'form-control', placeholder: '请输入：确认操作', id: '__danger_input__', style: { marginTop: '8px', padding: '8px 10px', border: '1px solid var(--line-strong)', borderRadius: '6px', width: '100%' } })
    ),
    okText: '我已确认，执行操作',
    onOk: () => {
      const v = document.getElementById('__danger_input__')?.value;
      if (v !== '确认操作') { toast('请正确输入确认语', 'warn'); return false; }
      return true;
    }
  });
  return !!ok;
}

/** 下载 Blob */
export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV 导出 */
export function toCSV(rows, cols) {
  const esc = v => {
    if (v == null) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const head = cols.map(c => esc(c.label)).join(',');
  const body = rows.map(r => cols.map(c => esc(typeof c.value === 'function' ? c.value(r) : r[c.key])).join(',')).join('\n');
  return '\ufeff' + head + '\n' + body;
}
