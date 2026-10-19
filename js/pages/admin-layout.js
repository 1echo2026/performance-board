/** 管理后台通用布局 */
import { h, $, clear } from '../ui.js';
import { Auth } from '../store.js';
import { navigate } from '../router.js';

const MENU = [
  { label: '订单管理', path: '/admin/orders', icon: '📊' },
  { label: '架构管理', path: '/admin/structure', icon: '🌳' },
  { label: '归档管理', path: '/admin/archive', icon: '🔒' },
  { label: '基地密钥', path: '/admin/keys', icon: '🔑' },
  { label: '操作日志', path: '/admin/logs', icon: '📝' },
  { label: '系统设置', path: '/admin/settings', icon: '⚙️' },
];

export function adminLayout(title, bodyNode) {
  const app = document.getElementById('app');
  clear(app);
  const sess = Auth.session();

  app.append(
    h('div', { style: { display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, minHeight: 'calc(100vh - 56px)', marginTop: 0 } },
      // 侧边栏
      h('aside', { style: { background: '#fff', borderRight: '1px solid var(--line)', padding: '16px 0', position: 'sticky', top: 56, height: 'calc(100vh - 56px)' } },
        h('div', { style: { padding: '0 16px 16px', borderBottom: '1px solid var(--line)', marginBottom: 12 } },
          h('div', { style: { fontSize: 12, color: '#9ca3af', marginBottom: 4 } }, '管理员'),
          h('div', { style: { fontWeight: 600, fontSize: 15 } }, sess?.username || '-')
        ),
        h('nav', {},
          ...MENU.map(m => h('a', {
            href: '#' + m.path,
            style: {
              display: 'block', padding: '9px 16px', color: location.hash === '#' + m.path ? '#1e3a8a' : '#374151',
              background: location.hash === '#' + m.path ? 'var(--brand-soft)' : 'transparent',
              fontWeight: location.hash === '#' + m.path ? 600 : 400,
              borderLeft: location.hash === '#' + m.path ? '3px solid var(--brand)' : '3px solid transparent',
              fontSize: 13.5, textDecoration: 'none'
            }
          }, m.icon + '  ' + m.label))
        )
      ),
      // 主区
      h('div', { style: { padding: '24px 28px' } },
        h('div', { class: 'page-header' }, h('div', { class: 'page-title' }, title)),
        bodyNode
      )
    )
  );
}
