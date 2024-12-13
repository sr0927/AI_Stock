function changetime(time) {
    const timestamp = time; // 秒為單位

    // 將時間戳轉換為毫秒
    const date = new Date(timestamp * 1000);

    // 手動調整到 UTC+8 時區
    const utc8Offset = 8 * 60; // UTC+8 時區的分鐘數
    const localDate = new Date(date.getTime() + utc8Offset * 60 * 1000);

    // 格式化日期和時間
    const formattedDate = localDate.toISOString().split('T')[0]; // yyyy-MM-dd 格式
    const formattedTime = localDate.toISOString().split('T')[1].slice(0, 5); // HH:mm 格式

    // 合併日期和時間
    const result = `${formattedDate} • ${formattedTime}`;

    return result // 輸出：2024-12-02 21:52
}

function decodeHTML(html) {
    const parser = new DOMParser();
    return parser.parseFromString(html, "text/html").documentElement.textContent;
}

function getnewslist() {
    const urlParams = new URLSearchParams(window.location.search); // 解析 URL 中的查詢參數
    // 獲取 newsid 的值
    const ParamsnewsId = urlParams.get('newsid');
    fetch(`/getnews`)
        .then(response => response.json())
        .then(data => {
            news = data["data"].find(news => news.newsId == ParamsnewsId)
            document.getElementById("news-title").innerHTML = news["title"];
            document.getElementById("news-time").innerHTML = changetime(news["publishAt"]);
            document.getElementById("news-img").src = news["coverSrc"]["l"]["src"]
            news_content = decodeHTML(news["content"]);
            document.getElementById("news-content").innerHTML = news_content;
            gptnews(news_content);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}
function gptnews(newsContent) {
    fetch('/gpt4v_news_analysis', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            news: newsContent
        })
    })
        .then(response => response.json())
        .then(data => {
            const positiveImpactDiv = document.getElementById('positive-impact');
            const negativeImpactDiv = document.getElementById('negative-impact');

            // 清空之前的內容
            positiveImpactDiv.innerHTML = '';
            negativeImpactDiv.innerHTML = '';
            if (data.error) {
                // 顯示錯誤訊息
                positiveImpactDiv.textContent = `Error: ${data.error}`;
                negativeImpactDiv.textContent = `Error: ${data.error}`;
            } else {
                // 渲染正向影響股票
                displayStockAccordion(data.positive_impact_stocks, positiveImpactDiv);

                // 渲染負面影響股票
                displayStockAccordion(data.negative_impact_stocks, negativeImpactDiv);
            }
        })
        .catch(error => {
            // 顯示異常錯誤訊息
            console.log(`Error: ${error}`)
        });
}


function displayStockAccordion(stockImpactData, container) {
    Object.keys(stockImpactData).forEach(impactLevel => {
        stockImpactData[impactLevel].forEach(stock => {
            const stockElement = document.createElement('div');
            stockElement.className = 'p-3 rounded-lg hover:bg-red-200 cursor-pointer transition';
            stockElement.innerHTML = `
        <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
                <p class="text-gray-800 font-medium">股票名稱: ${stock.股票名稱}</p></br>
                <p class="text-gray-800 font-medium">股票代號: ${stock.股票代號}</p>
                <span class="text-xs font-bold text-white px-2 py-1 rounded-lg ${impactLevel === '大' ? 'bg-green-500' : impactLevel === '中' ? 'bg-yellow-500' : 'bg-gray-400'
                }">${impactLevel}</span>
            </div>
        </div>
        <p class="text-gray-600 mt-2 hidden reason">${stock.原因}</p>
    `;

            // 點擊區塊展開/收合
            stockElement.addEventListener('click', function () {
                const reason = stockElement.querySelector('.reason');
                if (reason.classList.contains('hidden')) {
                    reason.classList.remove('hidden');
                } else {
                    reason.classList.add('hidden');
                }
            });

            container.appendChild(stockElement);

            // const accordionItem = document.createElement('div');
            // accordionItem.className = 'accordion-item bg-gray-200 p-4 rounded-md mt-2 flex justify-between items-center';

            // // 左侧显示股票代码和名称
            // const stockInfoDiv = document.createElement('div');
            // stockInfoDiv.className = 'flex flex-col';
            // stockInfoDiv.innerHTML = `
            //     <div><strong>股票代號:</strong> ${stock["股票代號"]}</div>
            //     <div><strong>股票名稱:</strong> ${stock["股票名稱"]}</div>
            // `;

            // // 右侧显示影响标签
            // const impactLabelDiv = document.createElement('div');
            // impactLabelDiv.className = `border px-2 py-1 rounded ${impactLevel === '大' ? 'border-red-500 text-red-500' :
            //     impactLevel === '中' ? 'border-yellow-500 text-yellow-500' :
            //         'border-green-500 text-green-500'
            //     }`;
            // impactLabelDiv.textContent = impactLevel;

            // // 原因部分
            // const reasonDiv = document.createElement('div');
            // reasonDiv.className = 'accordion-content mt-2 text-sm bg-white p-2 border rounded-md hidden';
            // reasonDiv.innerHTML = `<strong>原因:</strong> ${stock["原因"]}`;

            // // 点击显示/隐藏原因
            // accordionItem.addEventListener('click', () => {
            //     reasonDiv.classList.toggle('hidden');
            // });

            // accordionItem.appendChild(stockInfoDiv);
            // accordionItem.appendChild(impactLabelDiv);
            // container.appendChild(accordionItem);
            // container.appendChild(reasonDiv);  // 原因显示在手风琴项之下
        });
    });
}

/**
 * 渲染股票影響數據
 * @param {Object} stockImpactData - 股票影響數據
 * @param {HTMLElement} container - 容器元素
 * @param {string} title - 標題（正向/負向）
 */
function renderStockImpact(stockImpactData, container, title) {
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    titleElement.className = 'text-lg font-bold mb-4';
    container.appendChild(titleElement);

    Object.keys(stockImpactData).forEach(impactLevel => {
        stockImpactData[impactLevel].forEach(stock => {
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item bg-gray-200 p-4 rounded-md mt-2 flex justify-between items-center cursor-pointer';

            // 股票基本信息
            const stockInfoDiv = document.createElement('div');
            stockInfoDiv.className = 'flex flex-col';
            stockInfoDiv.innerHTML = `
                <div><strong>股票代號:</strong> ${stock["股票代號"]}</div>
                <div><strong>股票名稱:</strong> ${stock["股票名稱"]}</div>
            `;

            // 影響標籤
            const impactLabelDiv = document.createElement('div');
            impactLabelDiv.className = `border px-2 py-1 rounded ${impactLevel === '大' ? 'border-red-500 text-red-500' :
                impactLevel === '中' ? 'border-yellow-500 text-yellow-500' :
                    'border-green-500 text-green-500'
                }`;
            impactLabelDiv.textContent = impactLevel;

            // 原因部分（默認隱藏）
            const reasonDiv = document.createElement('div');
            reasonDiv.className = 'accordion-content mt-2 text-sm bg-white p-2 border rounded-md hidden';
            reasonDiv.innerHTML = `<strong>原因:</strong> ${stock["原因"]}`;

            // 點擊展開/收合原因
            accordionItem.addEventListener('click', () => {
                reasonDiv.classList.toggle('hidden');
            });

            // 組裝元素
            accordionItem.appendChild(stockInfoDiv);
            accordionItem.appendChild(impactLabelDiv);
            container.appendChild(accordionItem);
            container.appendChild(reasonDiv); // 原因緊跟在股票信息之下
        });
    });
}

getnewslist()
