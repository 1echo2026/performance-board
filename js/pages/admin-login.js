/** 管理后台登录 /admin/login */
import { h, $, clear, toast } from '../ui.js';
import { Auth, Logs } from '../store.js';
import { navigate } from '../router.js';

export function pageAdminLogin() {
  // 已登录直接跳后台
  if (Auth.session()) { navigate('/admin/orders'); return; }

  const app = $('#app');
  clear(app);

  // 隐藏顶栏；不要动 #app 的 DOM 结构（路由用 document.getElementById('app') 查找）
  const topbar = document.getElementById('topbar');
  topbar.dataset.prevHidden = topbar.hidden ? '1' : '';
  topbar.hidden = true;

  const username = h('input', { type: 'text', placeholder: '管理员账号', id: 'adm-user', autocomplete: 'username' });
  const password = h('input', { type: 'password', placeholder: '密码', id: 'adm-pass', autocomplete: 'current-password' });

  function doLogin() {
    const u = username.value.trim();
    const p = password.value;
    if (!u || !p) { toast('请输入账号和密码', 'warn'); return; }
    const sess = Auth.login(u, p);
    if (!sess) {
      Logs.add({ module: '登录', action: '登录失败', description: `账号 ${u} 登录失败` });
      toast('账号或密码错误', 'error');
      return;
    }
    Logs.add({ module: '登录', action: '登录成功', description: `管理员 ${u} 登录后台` });
    toast('登录成功', 'success');
    // 恢复顶栏后再跳转（由 router/layout 接管）
    navigate('/admin/orders');
  }

  password.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  // 清理钩子：每次 hash 变化都尝试恢复顶栏（登录成功后路由触发 layout.renderTopbar 接管）
  const hook = () => {
    if (location.hash !== '#/admin/login' && topbar.dataset.prevHidden !== '1') {
      topbar.hidden = false;
      window.removeEventListener('hashchange', hook);
    }
  };
  window.addEventListener('hashchange', hook);

  app.append(
    h('div', { class: 'auth-page', style: { display: 'flex' } },
      h('div', { class: 'auth-card' },
        h('div', {}, h('div', { class: 'brand-mark', style: { display: 'inline-flex' } }, 'B')),
        h('h1', {}, '管理后台登录'),
        h('div', { class: 'sub' }, '请使用管理员账号密码登录'),
        h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '账号'), username),
        h('div', { class: 'form-group', style: { marginBottom: 14, position: 'relative' } },
          h('label', {}, '密码'),
          password,
          h('button', { class: 'btn btn-ghost btn-sm', style: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }, type: 'button', onclick: () => {
            const el = document.getElementById('adm-pass');
            el.type = el.type === 'password' ? 'text' : 'password';
          } }, '👁')
        ),
        h('button', { class: 'btn-primary', style: { width: '100%', padding: '9px', fontSize: 14 }, onclick: doLogin }, '登录'),
        h('div', { style: { marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' } },
          '默认账号 admin / admin123'
        ),
        h('div', { style: { marginTop: 8, textAlign: 'center' } },
          h('a', { href: '#/', onclick: () => { topbar.hidden = false; window.removeEventListener('hashchange', hook); } }, '返回前台')
        )
      )
    )
  );
}
