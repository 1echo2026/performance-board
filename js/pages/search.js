/** 姓名查询 /search */
import { h, $, clear, fmtMoney } from '../ui.js';
import { Structure, BaseKey, Orders, Archive } from '../store.js';
import { rollupMonths, allMonths, personDetail } from '../engine.js';

export function pageSearch() {
  const app = $('#app');
  clear(app);
  const base = BaseKey.getSession();
  const months = allMonths();

  const input = h('input', { type: 'text', placeholder: '输入姓名关键词，如"张"、"王"、"主管"', id: 'search-input' });
  const monthSel = h('select', { id: 'search-month' },
    h('option', { value: '' }, '全部月份'),
    ...months.map(m => h('option', { value: m }, m))
  );
  const resultBox = h('div', { id: 'search-result', style: { marginTop: '16px' } });

  function doSearch() {
    const q = input.value.trim();
    const m = monthSel.value;
    clear(resultBox);
    if (!q) {
      resultBox.append(h('div', { class: 'empty' }, '输入姓名开始查询'));
      return;
    }
    const realMonths = m ? [m] : months;
    const rollup = rollupMonths(realMonths).filter(r => r.base_name === base && r.name.includes(q));
    if (!rollup.length) {
      resultBox.append(h('div', { class: 'empty' }, '未找到匹配 "' + q + '" 的人员'));
      return;
    }
    const cards = rollup.map(p => {
      const chain = p.chain || [];
      return h('div', { class: 'card', style: { marginBottom: 14 } },
        h('div', { class: 'card-body' },
          h('div', { class: 'flex-between' },
            h('div', {},
              h('span', { class: 'badge ' + roleBadge(p.role) }, p.role),
              h('span', { style: { marginLeft: 10, fontSize: 16, fontWeight: 600 } }, p.name),
              h('span', { class: 'muted', style: { marginLeft: 8 } }, base),
            ),
            h('div', { style: { textAlign: 'right' } },
              h('div', { class: 'amount', style: { fontSize: 18 } }, fmtMoney(p.team_perf)),
              h('div', { class: 'muted', style: { fontSize: 12 } }, p.role === '老师' ? '个人业绩' : '团队业绩')
            )
          ),
          h('div', { class: 'divider' }),
          h('div', {},
            h('div', { class: 'muted', style: { fontSize: 12, marginBottom: 6 } }, '组织归属链路'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
              chain.map((c, i) => [
                h('span', { class: 'badge ' + roleBadge(c.role) }, c.name + '（' + c.role + '）'),
                i < chain.length - 1 ? h('span', { class: 'muted' }, '›') : null
              ]).flat()
            )
          ),
          p.role !== '老师' ? h('div', { style: { marginTop: 8 } },
            h('span', { class: 'muted', style: { fontSize: 12 } }, '直接下属团队汇总按岗位逐级透传')) : null,
          p.role === '老师' ? h('div', { style: { marginTop: 8 } },
            h('span', { class: 'muted', style: { fontSize: 12 } }, '老师个人业绩 = 名下订单业绩之和')) : null
        )
      );
    });
    resultBox.append(...cards);
  }

  input.addEventListener('input', doSearch);
  monthSel.addEventListener('change', doSearch);

  app.append(
    h('div', { class: 'page-header' },
      h('div', {},
        h('div', { class: 'page-title' }, '姓名查询'),
        h('div', { class: 'page-sub' }, '基地：' + base + '  ·  仅展示本基地人员'),
      )
    ),
    h('div', { class: 'card' },
      h('div', { class: 'card-body' },
        h('div', { class: 'form-row' },
          h('div', { class: 'form-group' }, h('label', {}, '姓名（模糊匹配）'), input),
          h('div', { class: 'form-group', style: { maxWidth: 160 } }, h('label', {}, '月份筛选'), monthSel),
          h('button', { class: 'btn btn-primary', onclick: doSearch, style: { alignSelf: 'flex-end' } }, '查询')
        )
      )
    ),
    resultBox
  );
}

function roleBadge(role) {
  return role === '基地负责人' ? 'badge-danger' : role === '主管' ? 'badge-brand' : role === '组长' ? 'badge-warn' : 'badge-success';
}
