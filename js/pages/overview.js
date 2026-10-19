/** 总览仪表盘 / */
import { h, $, clear, fmtMoney } from '../ui.js';
import { dashboardSummary, allMonths } from '../engine.js';
import { barChart, donutChart, assignColors } from '../charts.js';

const state = { filterMonth: '' };

export function pageOverview() {
  state.filterMonth = '';
  render();
}

function render() {
  const app = $('#app');
  clear(app);

  // 月份筛选
  const months = allMonths();
  const realMonths = state.filterMonth ? [state.filterMonth] : months;
  const summary = dashboardSummary(realMonths);

  app.append(
    h('div', { class: 'page-header' },
      h('div', {},
        h('div', { class: 'page-title' }, '业绩总览仪表盘'),
        h('div', { class: 'page-sub' }, '实时汇总 · 全基地'),
      ),
      h('select', {
        onchange: e => { state.filterMonth = e.target.value; render(); }
      },
        h('option', { value: '' }, '全部月份'),
        ...months.map(m => h('option', { value: m, selected: state.filterMonth === m ? '' : undefined }, m))
      )
    ),
    // KPI
    h('div', { class: 'kpi-row' },
      kpiCard('总业绩', fmtMoney(summary.total_perf), summary.months.join('、') || '-'),
      kpiCard('基地数', String(summary.base_count), '-'),
      kpiCard('主管数', String(summary.manager_count), '-'),
      kpiCard('组长数', String(summary.head_count), '-'),
      kpiCard('老师数', String(summary.teacher_count), '-'),
    ),
    // 图表区
    h('div', { class: 'grid-2' },
      h('div', { class: 'card' },
        h('div', { class: 'card-header' }, h('h3', {}, '分基地业绩')),
        h('div', { class: 'card-body' },
          h('div', { class: 'chart-box' },
            barChart(
              summary.bases.map(b => ({ label: b, value: summary.byBase[b] || 0 })),
              { width: 520, height: 260, color: '#2563eb' }
            )
          )
        )
      ),
      h('div', { class: 'card' },
        h('div', { class: 'card-header' }, h('h3', {}, '业绩占比')),
        h('div', { class: 'card-body', style: { display: 'flex', justifyContent: 'center' } },
          donutChart(
            assignColors(summary.bases.map(b => ({ label: b, value: summary.byBase[b] || 0 }))),
            { width: 340, height: 280 }
          )
        )
      )
    ),
    // 排行
    h('div', { class: 'grid-2', style: { marginTop: '16px' } },
      rankCard('主管业绩 TOP', summary.managerTop),
      rankCard('组长业绩 TOP', summary.headTop),
    )
  );
}

function kpiCard(label, value, sub) {
  return h('div', { class: 'kpi' },
    h('div', { class: 'kpi-label' }, label),
    h('div', { class: 'kpi-value' }, value),
    h('div', { class: 'kpi-sub' }, sub || '')
  );
}

function rankCard(title, rows) {
  return h('div', { class: 'card' },
    h('div', { class: 'card-header' }, h('h3', {}, title)),
    h('div', { class: 'card-body', style: { padding: 0 } },
      h('table', {},
        h('thead', {}, h('tr', {},
          h('th', { style: { width: 40 } }, '排名'),
          h('th', {}, '姓名'),
          h('th', {}, '基地'),
          h('th', { style: { textAlign: 'right' } }, '团队业绩')
        )),
        h('tbody', {},
          rows.length ? rows.map((r, i) => h('tr', {},
            h('td', {}, i < 3 ? h('span', { class: 'badge ' + (i === 0 ? 'badge-danger' : i === 1 ? 'badge-warn' : 'badge-brand') }, 'TOP ' + (i + 1)) : String(i + 1)),
            h('td', { style: { fontWeight: 500 } }, r.name),
            h('td', {}, r.base_name),
            h('td', { class: 'amount' }, fmtMoney(r.team_perf))
          )) : h('tr', {}, h('td', { colspan: 4, style: { textAlign: 'center', padding: '32px', color: '#9ca3af' } }, '暂无数据'))
        )
      )
    )
  );
}
