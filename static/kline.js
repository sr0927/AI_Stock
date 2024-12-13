// kline.js

// 從後端取得資料的函式
async function fetchStockData(symbol = '2330.TW') {
    const res = await fetch(`/stock_data?symbol=${symbol}&period=6mo&interval=1d`);
    const data = await res.json();
    return data;
}

// 圖表實例參考
let trendChartInstance = null;
let mainChartInstance = null;
let subChartInstance = null;

/** 元件函式: 走勢圖(紅色階梯+陰影) */
function renderTrendChart(domId, dates, closePrices) {
    const chartDom = document.getElementById(domId);
    if (trendChartInstance) trendChartInstance.dispose();
    trendChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                const p = params[0];
                return `${p.axisValue}<br>${p.seriesName}: ${p.data} TWD`;
            }
        },
        xAxis: { type: 'category', data: dates, boundaryGap: false },
        yAxis: { type: 'value', scale: true, axisLabel: { formatter: '{value} TWD' } },
        grid: { left: '10%', right: '10%', bottom: '15%' },
        series: [{
            name: '價格',
            type: 'line',
            data: closePrices,
            step: 'end',
            lineStyle: { color: 'red', width: 2 },
            areaStyle: {
                color: {
                    type: 'linear',
                    x: 0, y: 0, x2: 0, y2: 1,
                    colorStops: [
                        { offset: 0, color: 'rgba(255,0,0,0.3)' },
                        { offset: 1, color: 'rgba(255,0,0,0)' }
                    ]
                }
            },
            symbol: 'none'
        }]
    };
    trendChartInstance.setOption(option);
}

/** 元件函式: 主圖(K線 + MA) */
function renderMainChart(domId, dates, candlestickData, ma5, ma20, ma60) {
    const chartDom = document.getElementById(domId);
    if (mainChartInstance) mainChartInstance.dispose();
    mainChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['K線', 'MA5', 'MA20', 'MA60'] },
        xAxis: { type: 'category', data: dates, boundaryGap: true },
        yAxis: { scale: true },
        series: [
            {
                name: 'K線',
                type: 'candlestick',
                data: candlestickData,
                itemStyle: {
                    color: '#ec0000',
                    color0: '#00da3c',
                    borderColor: '#8A0000',
                    borderColor0: '#008F28'
                }
            },
            { name: 'MA5', type: 'line', data: ma5, lineStyle: { width: 1, color: 'blue' } },
            { name: 'MA20', type: 'line', data: ma20, lineStyle: { width: 1, color: 'orange' } },
            { name: 'MA60', type: 'line', data: ma60, lineStyle: { width: 1, color: 'green' } }
        ]
    };
    mainChartInstance.setOption(option);
}

/** 元件函式: 成交量圖表 */
function renderVolumeChart(domId, dates, volumes) {
    const chartDom = document.getElementById(domId);
    if (subChartInstance) subChartInstance.dispose();
    subChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series: [
            {
                name: 'Volume',
                type: 'bar',
                data: volumes,
                itemStyle: {
                    color: (param) => param.data >= 0 ? '#ec0000' : '#00da3c'
                }
            }
        ]
    };
    subChartInstance.setOption(option);
}

/** 元件函式: KDJ圖表 */
function renderKDJChart(domId, dates, kData, dData, jData) {
    const chartDom = document.getElementById(domId);
    if (subChartInstance) subChartInstance.dispose();
    subChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['K', 'D', 'J'] },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series: [
            { name: 'K', type: 'line', data: kData, lineStyle: { color: 'blue' } },
            { name: 'D', type: 'line', data: dData, lineStyle: { color: 'orange' } },
            { name: 'J', type: 'line', data: jData, lineStyle: { color: 'purple' } }
        ]
    };
    subChartInstance.setOption(option);
}

/** 元件函式: MACD圖表 */
function renderMACDChart(domId, dates, difData, deaData, histData) {
    const chartDom = document.getElementById(domId);
    if (subChartInstance) subChartInstance.dispose();
    subChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['DIF', 'DEA', 'MACD'] },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series: [
            { name: 'DIF', type: 'line', data: difData, lineStyle: { color: 'blue' } },
            { name: 'DEA', type: 'line', data: deaData, lineStyle: { color: 'orange' } },
            {
                name: 'MACD',
                type: 'bar',
                data: histData,
                itemStyle: {
                    color: (p) => p.data >= 0 ? '#ec0000' : '#00da3c'
                }
            }
        ]
    };
    subChartInstance.setOption(option);
}

/** 元件函式: RSI圖表 (泛用於單線指標) */
function renderRSIChart(domId, dates, data, legendName = 'RSI', lineColor = 'green') {
    const chartDom = document.getElementById(domId);
    if (subChartInstance) subChartInstance.dispose();
    subChartInstance = echarts.init(chartDom);

    const option = {
        tooltip: { trigger: 'axis' },
        legend: { data: [legendName] },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value', scale: true },
        series: [
            { name: legendName, type: 'line', data: data, lineStyle: { color: lineColor } }
        ]
    };
    subChartInstance.setOption(option);
}

/** 更新指標圖表函式 */
function updateIndicator(indicator, data) {
    const dates = data.map(d => d.Date);
    if (subChartInstance) subChartInstance.dispose();

    switch (indicator) {
        case 'volume':
            const volumes = data.map(d => d.Volume);
            renderVolumeChart('subChart', dates, volumes);
            break;
        case 'kdj':
            const kValues = data.map(d => d.K);
            const dValues = data.map(d => d.D);
            const jValues = data.map(d => d.J);
            renderKDJChart('subChart', dates, kValues, dValues, jValues);
            break;
        case 'macd':
            const difData = data.map(d => d.DIF);
            const deaData = data.map(d => d.DEA);
            const histData = data.map(d => d.MACD_Hist);
            renderMACDChart('subChart', dates, difData, deaData, histData);
            break;
        case 'rsi':
            const rsiData = data.map(d => d.RSI);
            renderRSIChart('subChart', dates, rsiData, 'RSI', 'green');
            break;
        case 'bias':
            const biasData = data.map(d => d.BIAS);
            renderRSIChart('subChart', dates, biasData, 'BIAS', 'orange');
            break;
        case 'wr':
            const wrData = data.map(d => d.WR);
            renderRSIChart('subChart', dates, wrData, 'WR', 'purple');
            break;
        case 'difBias':
            const difBiasData = data.map(d => d.DIF_Bias);
            renderRSIChart('subChart', dates, difBiasData, '多空指標乖離', 'red');
            break;
        case 'cdp':
            const cdpData = data.map(d => d.CDP);
            renderRSIChart('subChart', dates, cdpData, 'CDP', 'blue');
            break;
        case 'dmi':
            const pdiData = data.map(d => d.PDI);
            const mdiData = data.map(d => d.MDI);
            const adxData = data.map(d => d.ADX);
            renderKDJChart('subChart', dates, pdiData, mdiData, adxData);
            break;
        default:
            const defaultVolumes = data.map(d => d.Volume);
            renderVolumeChart('subChart', dates, defaultVolumes);
    }
}

// 當DOM內容載入完畢後開始掛上事件
document.addEventListener('DOMContentLoaded', () => {
    const fetchBtn = document.getElementById('fetchDataBtn');
    const indicatorSelect = document.getElementById('indicatorSelect');
    const symbolInput = document.getElementById('searchInput');

    fetchBtn.addEventListener('click', async () => {
        const symbol = symbolInput.value + '.TW';
        const data = await fetchStockData(symbol);
        console.log(data)
        const dates = data.map(d => d.Date);
        const closePrices = data.map(d => d.Close);
        // 繪製走勢圖
        renderTrendChart('trendChart', dates, closePrices);

        const candlestickData = data.map(d => [d.Open, d.Close, d.Low, d.High]);
        const ma5 = data.map(d => d.MA5);
        const ma20 = data.map(d => d.MA20);
        const ma60 = data.map(d => d.MA60);

        // 主圖
        renderMainChart('mainChart', dates, candlestickData, ma5, ma20, ma60);

        // 初始指標
        const indicator = indicatorSelect.value;
        updateIndicator(indicator, data);
    });

    indicatorSelect.addEventListener('change', () => {
        const symbol = symbolInput.value + '.TW';
        const indicator = indicatorSelect.value;
        fetchStockData(symbol).then(data => {
            updateIndicator(indicator, data);
        });
    });

    // 預設載入
    // fetchBtn.click();
});
