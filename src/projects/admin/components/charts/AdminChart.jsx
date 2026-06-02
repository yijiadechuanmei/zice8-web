import ReactECharts from 'echarts-for-react'

const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#64748b']

export default function AdminChart({ type = 'line', title, data = [], series = [], loading = false, emptyText = '暂无图表数据', height = 260 }) {
  if (!loading && !data.length) {
    return <div className="admin-chart-empty">{emptyText}</div>
  }

  return (
    <ReactECharts
      style={{ height, width: '100%' }}
      notMerge
      lazyUpdate
      showLoading={loading}
      option={buildOption({ type, title, data, series })}
    />
  )
}

function buildOption({ type, title, data, series }) {
  if (type === 'bar') return buildBarOption({ title, data, series, horizontal: false })
  if (type === 'horizontalBar') return buildBarOption({ title, data, series, horizontal: true })
  if (type === 'donut') return buildDonutOption({ title, data, series })
  return buildLineOption({ title, data, series })
}

function baseOption(title) {
  return {
    color: palette,
    backgroundColor: 'transparent',
    title: title ? { text: title, textStyle: { color: '#0f172a', fontSize: 13, fontWeight: 700 }, top: 0, left: 0 } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 12],
      textStyle: { color: '#0f172a', fontSize: 12 },
      extraCssText: 'box-shadow:0 14px 34px rgba(15,23,42,.14);',
      valueFormatter: (value) => formatNumber(value),
    },
    legend: { top: 0, right: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 8, textStyle: { color: '#64748b', fontSize: 11 } },
    grid: { top: title ? 46 : 28, left: 42, right: 18, bottom: 34, containLabel: true },
  }
}

function buildLineOption({ title, data, series }) {
  return {
    ...baseOption(title),
    xAxis: axis('category', data.map((item) => item.date || item.name || item.label)),
    yAxis: axis('value'),
    series: series.map((item, index) => ({
      name: item.name,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 3 },
      areaStyle: index === 0 ? { opacity: 0.08 } : undefined,
      data: data.map((row) => row[item.key] ?? 0),
    })),
  }
}

function buildBarOption({ title, data, series, horizontal }) {
  const categories = data.map((item) => item.name || item.label || item.title || item.date)
  const option = {
    ...baseOption(title),
    tooltip: { ...baseOption(title).tooltip, trigger: 'axis' },
    xAxis: horizontal ? axis('value') : axis('category', categories),
    yAxis: horizontal ? axis('category', categories) : axis('value'),
    series: series.map((item) => ({
      name: item.name,
      type: 'bar',
      barMaxWidth: 22,
      tooltip: { valueFormatter: (value) => item.percent ? `${formatNumber(value)}%` : formatNumber(value) },
      itemStyle: { borderRadius: horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0] },
      data: data.map((row) => item.percent ? Number(((row[item.key] || 0) * 100).toFixed(2)) : row[item.key] ?? 0),
    })),
  }
  if (horizontal) option.grid = { ...option.grid, left: 100 }
  return option
}

function buildDonutOption({ title, data, series }) {
  const valueKey = series[0]?.key || 'value'
  return {
    ...baseOption(title),
    tooltip: {
      ...baseOption(title).tooltip,
      trigger: 'item',
      formatter: (params) => `${params.marker}${params.name}<br/>${params.seriesName}: ${formatNumber(params.value)} (${params.percent}%)`,
    },
    legend: { bottom: 0, left: 'center', icon: 'circle', textStyle: { color: '#64748b', fontSize: 11 } },
    series: [
      {
        name: series[0]?.name || '占比',
        type: 'pie',
        radius: ['54%', '74%'],
        center: ['50%', '45%'],
        itemStyle: { borderColor: '#ffffff', borderWidth: 2 },
        label: { color: '#334155', formatter: '{b} {d}%' },
        data: data.map((item) => ({ name: item.name || item.label, value: item[valueKey] || 0 })),
      },
    ],
  }
}

function axis(type, data) {
  return {
    type,
    data,
    axisLine: { lineStyle: { color: '#dbe3ef' } },
    axisTick: { show: false },
    axisLabel: { color: '#64748b', fontSize: 11 },
    splitLine: type === 'value' ? { lineStyle: { color: '#eef2f7' } } : { show: false },
  }
}

function formatNumber(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return value
  return number.toLocaleString('zh-CN')
}
