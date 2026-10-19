/** 公共布局：顶栏 + 基地密钥保护 */
import { h, $, clear } from './ui.js';
import { navigate, current, isActive } from './router.js';
import { Auth, BaseKey, Structure } from './store.js';

export function renderTopbar() {
  const tb = $('#topbar');
  tb.hidden = false;
  clear($('#nav'));
  clear($('#topbar-right'));

  const nav = $('#nav');
  const sess = Auth.session();
  const base = BaseKey.getSession();

  const publicLinks = [
    { label: '总览', path: '/' },
    { label: '姓名查询', path: '/search', needBase: true },
    { label: '组织架构', path: '/structure', needBase: true },
    { label: '订单明细', path: '/orders', needBase: true },
  ];

  publicLinks.forEach(l => {
    const a = h('a', { class: isActive(l.path) ? 'active' : '', href: '#' + l.path }, l.label);
    nav.appendChild(a);
  });

  const right = $('#topbar-right');
  if (base) {
    right.appendChild(h('span', { class: 'base-badge' }, '当前基地：' + base));
    right.appendChild(h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { BaseKey.clearSession(); navigate('/base-key-verify'); } }, '切换基地'));
  } else {
    right.appendChild(h('button', { class: 'btn btn-ghost btn-sm', onclick: () => navigate('/base-key-verify') }, '选择基地'));
  }

  if (sess) {
    right.appendChild(h('span', {}, '|'));
    right.appendChild(h('span', {}, '管理员：' + sess.username));
    right.appendChild(h('button', { class: 'btn btn-ghost btn-sm', onclick: () => { Auth.logout(); location.hash = '#/'; location.reload(); } }, '退出'));
  }
}

/** 基地密钥守卫 */
export function requireBaseAuth() {
  if (current() === '/base-key-verify') return true;
  if (current().startsWith('/admin')) return true;
  const b = BaseKey.getSession();
  if (!b) { navigate('/base-key-verify'); return false; }
  return true;
}

/** 管理员守卫 */
export function requireAdmin() {
  if (current() === '/admin/login') return true;
  if (current().startsWith('/admin')) {
    const sess = Auth.session();
    if (!sess) { navigate('/admin/login'); return false; }
    return true;
  }
  return true;
}
