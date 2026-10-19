/** Hash 路由 */
const routes = [];
let currentHash = location.hash;
let appBooted = false;

export function register(pattern, handler) {
  // pattern: "/", "/admin/login", "/search" 或带参数 "/person/:id"
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/:\w+/g, m => { keys.push(m.slice(1)); return '(\\w+)'; }) + '$'
  );
  routes.push({ re, keys, pattern, handler });
}

export function navigate(hash) {
  if (!hash.startsWith('#')) hash = '#' + hash;
  if (location.hash === hash) trigger();
  else location.hash = hash;
}

export function trigger() {
  const hash = location.hash.slice(1) || '/';
  currentHash = hash;
  for (const r of routes) {
    const m = hash.match(r.re);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => { params[k] = m[i + 1]; });
      r.handler({ params, path: hash });
      return;
    }
  }
  // 404
  const app = document.getElementById('app');
  if (app) app.innerHTML = `<div class="empty"><div class="empty-icon">🚫</div><div>未找到页面：<code>${hash}</code></div><div style="margin-top:12px"><a href="#/">返回首页</a></div></div>`;
}

function onHashChange() {
  const hash = location.hash.slice(1) || '/';
  if (hash !== currentHash) trigger();
}

export function boot() {
  if (appBooted) return;
  appBooted = true;
  window.addEventListener('hashchange', onHashChange);
  trigger();
}

export function current() { return location.hash.slice(1) || '/'; }

export function isActive(pattern) {
  const hash = location.hash.slice(1) || '/';
  if (pattern === hash) return true;
  return hash.startsWith(pattern.replace(/\/$/, ''));
}
