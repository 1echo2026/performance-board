/** 管理后台登录 /admin/login */
import { h, $, clear, toast } from '../ui.js';
import { Auth, Logs } from '../store.js';
import { navigate } from '../router.js';

export function pageAdminLogin() {
  // 已登录直接跳后台
  if (Auth.session()) { navigate('/admin/orders'); return; }

  const app = $('#app');
  clear(app);

  const username = h('input', { type: 'text', placeholder: '管理员账号', id: 'adm-user', autocomplete: 'username' });
  const password = h('input', { type: 'password', placeholder: '密码', id: 'adm-pass', autocomplete: 'current-password' });
  const showBtn = h('button', { class: 'btn btn-ghost btn-sm', style: { position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }, type: 'button', onclick: () => {
    const el = document.getElementById('adm-pass');
    el.type = el.type === 'password' ? 'text' : 'password';
  } }, '👁');

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
    navigate('/admin/orders');
  }

  password.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

  document.body.className = '';
  // 覆盖布局：登录页全屏蓝
  const origTopbar = document.getElementById('topbar');
  const origDisplay = origTopbar.style.display;
  origTopbar.style.display = 'none';

  app.outerHTML = ''; // 移除原容器
  const newApp = document.createElement('div');
  newApp.className = 'auth-page';
  newApp.id = 'app';
  document.body.appendChild(newApp);

  newApp.append(
    h('div', { class: 'auth-card' },
      h('div', {}, h('div', { class: 'brand-mark', style: { display: 'inline-flex' } }, 'B')),
      h('h1', {}, '管理后台登录'),
      h('div', { class: 'sub' }, '请使用管理员账号密码登录'),
      h('div', { class: 'form-group', style: { marginBottom: 12 } }, h('label', {}, '账号'), username),
      h('div', { class: 'form-group', style: { marginBottom: 14, position: 'relative' } },
        h('label', {}, '密码'),
        password,
        showBtn
      ),
      h('button', { class: 'btn-primary', onclick: doLogin }, '登录'),
      h('div', { style: { marginTop: 16, fontSize: 12, color: '#9ca3af', textAlign: 'center' } },
        '默认账号 admin / admin123'
      ),
      h('div', { style: { marginTop: 8, textAlign: 'center' } },
        h('a', { href: '#/', onclick: () => { origTopbar.style.display = origDisplay; } }, '返回前台')
      )
    )
  );

  // 恢复原 body
  setTimeout(() => {
    const observer = new MutationObserver(() => {
      if (!document.body.contains(origTopbar) || origTopbar.style.display !== 'none') {
        origTopbar.style.display = origDisplay;
      }
    });
    observer.observe(document.body, { childList: true, subtree: false });
  }, 0);
}
