/** 基地密钥验证页 /base-key-verify */
import { h, $, clear, toast, fmtMoney } from '../ui.js';
import { Structure, BaseKey } from '../store.js';
import { navigate } from '../router.js';
import { dashboardSummary, allMonths } from '../engine.js';

export function pageBaseKeyVerify() {
  const app = $('#app');
  clear(app);
  app.append(h('div', { class: 'base-verify' },
    h('div', { class: 'card' },
      h('div', { style: { textAlign: 'center', marginBottom: '18px' } },
        h('div', { class: 'brand-mark', style: { display: 'inline-flex', width: '40px', height: '40px', borderRadius: '10px', background: 'var(--brand)', color: '#fff', alignItems: 'center', justifyContent: 'center', fontWeight: 700 } }, 'B'),
        h('h2', { style: { marginTop: '12px' } }, '选择你的基地'),
        h('div', { class: 'muted' }, '请输入基地访问密钥以查看本基地详细数据')
      ),
      h('div', { class: 'form-row' },
        h('div', { class: 'form-group' },
          h('label', {}, '基地'),
          h('select', { id: 'verify-base' },
            h('option', { value: '' }, '请选择基地'),
            ...Structure.allBases().map(b => h('option', { value: b }, b))
          )
        )
      ),
      h('div', { class: 'form-row' },
        h('div', { class: 'form-group' },
          h('label', {}, '访问密钥'),
          h('div', { style: { position: 'relative' } },
            h('input', { id: 'verify-key', type: 'password', placeholder: '请输入基地密钥' }),
            h('button', { class: 'btn btn-ghost', style: { position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: '4px 8px' }, onclick: e => {
              const inp = document.getElementById('verify-key');
              inp.type = inp.type === 'password' ? 'text' : 'password';
              e.target.textContent = inp.type === 'password' ? '👁' : '🙈';
            } }, '👁')
          )
        )
      ),
      h('button', { class: 'btn btn-primary', style: { width: '100%', marginTop: '8px', padding: '9px' }, onclick: doVerify }, '进入看板'),
      h('div', { class: 'muted', style: { fontSize: 12, marginTop: 14, textAlign: 'center' },
        innerHTML: '提示：总览仪表盘无需密钥即可查看全部基地汇总数据。' })
    )
  ));

  // 回车提交
  setTimeout(() => {
    document.getElementById('verify-key')?.addEventListener('keydown', e => { if (e.key === 'Enter') doVerify(); });
    document.getElementById('verify-base')?.addEventListener('change', () => document.getElementById('verify-key')?.focus());
  }, 0);
}

function doVerify() {
  const base = document.getElementById('verify-base').value;
  const key = document.getElementById('verify-key').value.trim();
  if (!base) { toast('请先选择基地', 'warn'); return; }
  if (!key) { toast('请输入密钥', 'warn'); return; }
  if (!BaseKey.verify(base, key)) { toast('密钥错误，请重试', 'error'); return; }
  BaseKey.setSession(base);
  toast('验证成功，欢迎 ' + base, 'success');
  navigate('/search');
}
