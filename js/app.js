/** 路由总表 */
import { register, boot, navigate } from './router.js';
import { renderTopbar, requireBaseAuth, requireAdmin } from './layout.js';

function render(pageFn, opts = {}) {
  return ({ params, path }) => {
    renderTopbar();
    if (opts.needBase && !requireBaseAuth()) return;
    if (opts.needAdmin && !requireAdmin()) return;
    const app = document.getElementById('app');
    app.innerHTML = '';
    pageFn(params, path);
  };
}

// ===== 前台 =====
import { pageOverview } from './pages/overview.js';
import { pageBaseKeyVerify } from './pages/base-key.js';
import { pageSearch } from './pages/search.js';
import { pageStructure } from './pages/structure.js';
import { pageOrders } from './pages/orders.js';

register('/', render(pageOverview));
register('/base-key-verify', render(pageBaseKeyVerify));
register('/search', render(pageSearch, { needBase: true }));
register('/structure', render(pageStructure, { needBase: true }));
register('/orders', render(pageOrders, { needBase: true }));

// ===== 后台 =====
import { pageAdminLogin } from './pages/admin-login.js';
import { pageAdminOrders } from './pages/admin-orders.js';
import { pageAdminStructure } from './pages/admin-structure.js';
import { pageAdminArchive } from './pages/admin-archive.js';
import { pageAdminKeys } from './pages/admin-keys.js';
import { pageAdminLogs } from './pages/admin-logs.js';
import { pageAdminSettings } from './pages/admin-settings.js';

register('/admin/login', render(pageAdminLogin));
register('/admin/orders', render(pageAdminOrders, { needAdmin: true }));
register('/admin/structure', render(pageAdminStructure, { needAdmin: true }));
register('/admin/archive', render(pageAdminArchive, { needAdmin: true }));
register('/admin/keys', render(pageAdminKeys, { needAdmin: true }));
register('/admin/logs', render(pageAdminLogs, { needAdmin: true }));
register('/admin/settings', render(pageAdminSettings, { needAdmin: true }));

// 重定向
register('/admin', () => navigate('/admin/orders'));

boot();
