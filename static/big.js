// main.js

// 元件函式：從後端取得大盤資料
async function fetchMarketData(symbol = '^TWII') {
    const res = await fetch('/market_data');
    const data = await res.json();
    return data;
}

// 元件函式：更新市場資訊 (價格、漲跌幅、開高低昨收)
function renderMarketInfo(data, prevClose) {
    const infoDiv = document.getElementById('info');
    if (data.length === 0) {
        infoDiv.innerText = '目前無可用資料(非交易時間?)';
        return;
    }

    const latest = data[data.length - 1];
    const openPrice = data[0].open;
    const highPrice = Math.max(...data.map(d => d.high));
    const lowPrice = Math.min(...data.map(d => d.low));

    const change = (latest.close - prevClose);
    const changePercent = (change / prevClose) * 100;

    const indexValueElem = document.getElementById('indexValue');
    const changeInfoElem = document.getElementById('changeInfo');

    indexValueElem.textContent = latest.close.toFixed(2);
    document.getElementById('openPrice').textContent = openPrice.toFixed(2);
    document.getElementById('highPrice').textContent = highPrice.toFixed(2);
    document.getElementById('lowPrice').textContent = lowPrice.toFixed(2);
    document.getElementById('prevClose').textContent = prevClose.toFixed(2);

    let sign = change >= 0 ? '▲' : '▼';
    let color = change >= 0 ? 'red' : 'green';

    changeInfoElem.textContent = `${sign}${Math.abs(change).toFixed(2)} (${sign}${Math.abs(changePercent).toFixed(2)}%)`;
    changeInfoElem.style.color = color;
    indexValueElem.style.color = color;
}

// 元件函式：繪製圖表 (指數線 + 成交量Bar)
function renderMarketChart(domId, dates, closes, volumes) {
    const chartDom = document.getElementById(domId);
    const myChart = echarts.init(chartDom);

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross' }
        },
        legend: { data: ['指數', '成交量'] },
        xAxis: {
            type: 'category',
            data: dates,
            axisLabel: {
                formatter(value) {
                    const t = new Date(value);
                    return t.getHours() + ':' + String(t.getMinutes()).padStart(2, '0');
                }
            }
        },
        yAxis: [
            { type: 'value', scale: true, name: '指數', position: 'left' },
            { type: 'value', scale: true, name: '成交量', position: 'right' }
        ],
        series: [
            {
                name: '指數',
                type: 'line',
                data: closes,
                yAxisIndex: 0,
                lineStyle: { color: 'blue' },
                symbol: 'none'
            },
            {
                name: '成交量',
                type: 'bar',
                data: volumes,
                yAxisIndex: 1,
                itemStyle: { color: 'green' }
            }
        ],
        grid: { left: '10%', right: '10%', bottom: '10%' }
    };

    myChart.setOption(option);
}

// 元件函式：初始化整個流程
async function init() {
    const data = await fetchMarketData();
    if (data.length === 0) {
        document.getElementById('info').innerText = '目前無可用資料';
        return;
    }

    const dates = data.map(d => d.timestamp);
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);

    // 假設 first close 為昨收(實務中可從前日資料取得更準確的昨收)
    const prevClose = data[0].close;

    // 更新市場資訊
    renderMarketInfo(data, prevClose);

    // 繪製圖表
    renderMarketChart('chart', dates, closes, volumes);
}

document.addEventListener('DOMContentLoaded', init);
