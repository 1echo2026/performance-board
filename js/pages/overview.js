/** 总览仪表盘 / */
import { h, $, clear, fmtMoney } from '../ui.js';
import { dashboardSummary, allMonths } from '../engine.js';
import { Orders, Archive } from '../store.js';
import { barChart, donutChart, assignColors } from '../charts.js';

const state = { months: [] };

export function pageOverview() {
  const app = $('#app');
  app.innerHTML = '';
  state.months = allMonths();
  render();
}

function render() {
  const app = $('#app');
  clear(app);

  // 筛选
  const monthOpts = [h('option', { value: '' }, '全部月份')];
  state.months.forEach(m => monthOpts.push(h('option', { value: m, selected: state.months.length === 1 ? 'selected' : '' }, m)));
  const selectedMonth = state.months.length === 1 ? state.months[0] : '';
  if (selectedMonth) state.months = [selectedMonth];
  const realMonths = state.months.length ? state.months : allMonths();
  const summary = dashboardSummary(realMonths);

  app.append(
    h('div', { class: 'page-header' },
      h('div', {},
        h('div', { class: 'page-title' }, '业绩总览仪表盘'),
        h('div', { class: 'page-sub' }, '实时汇总 · 全基地'),
      ),
      h('div', {},
        h('select', {
          onchange: e => {
            const v = e.target.value;
            state.months = v ? [v] : allMonths();
            const m = allMonths();
            const sel = document.querySelector('[data-filter-month]');
            m.forEach(o => { if (o.value === v) o.selected = true; else o.selected = false; });
            render();
          },
          id: 'filter-month'
        },
          h('option', { value: '' }, '全部月份'),
          ...allMonths().map(m => h('option', { value: m }, m))
        )
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
      rankCard('主管业绩 TOP', summary.managerTop, '主管'),
      rankCard('组长业绩 TOP', summary.headTop, '组长'),
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

function rankCard(title, rows, roleLabel) {
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
