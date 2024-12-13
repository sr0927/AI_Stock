document.addEventListener('DOMContentLoaded', function () {
    const addedStocks = [];

    document.getElementById('searchForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput').value.trim();

        if (searchInput === '') {
            alert('请输入股票名称或代码');
            return;
        }

        fetch(`/search?query=${searchInput}`)
            .then(response => response.json())
            .then(data => {
                displayResults(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    });

    // document.getElementById('analyzeButton').addEventListener('click', function () {
    //     const newsContent = document.getElementById('newsContent').value.trim();
    //     if (newsContent === '') {
    //         alert('请输入新闻内容');
    //         return;
    //     }

    //     fetch('/gpt4v_news_analysis', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json'
    //         },
    //         body: JSON.stringify({
    //             news: newsContent
    //         })
    //     })
    //         .then(response => response.json())
    //         .then(data => {
    //             const positiveImpactDiv = document.getElementById('positiveImpactStocks');
    //             const negativeImpactDiv = document.getElementById('negativeImpactStocks');

    //             positiveImpactDiv.innerHTML = '';  // 清空之前的内容
    //             negativeImpactDiv.innerHTML = '';  // 清空之前的内容
    //             console.log(data)
    //             if (data.error) {
    //                 positiveImpactDiv.textContent = `Error: ${data.error}`;
    //                 negativeImpactDiv.textContent = `Error: ${data.error}`;
    //             } else {
    //                 // 显示正面影响的股票列表
    //                 displayStockAccordion(data.positive_impact_stocks, positiveImpactDiv);

    //                 // 显示负面影响的股票列表
    //                 displayStockAccordion(data.negative_impact_stocks, negativeImpactDiv);
    //             }
    //         })
    //         .catch(error => {
    //             document.getElementById('positiveImpactStocks').textContent = `Error: ${error}`;
    //             document.getElementById('negativeImpactStocks').textContent = `Error: ${error}`;
    //         });
    // });

    function displayResults(stockResults) {
        const resultsList = document.getElementById('resultsList');
        resultsList.innerHTML = '';

        if (stockResults.length === 0) {
            resultsList.innerHTML = '<li class="text-red-500">未找到匹配的结果</li>';
            return;
        }

        stockResults.forEach(stock => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center bg-gray-200 p-4 rounded-md';

            const stockInfo = document.createElement('div');
            stockInfo.innerHTML = `<strong>${stock["公司名稱"]}</strong> (${stock["公司代號"]})`;
            listItem.appendChild(stockInfo);

            const addButton = document.createElement('button');
            addButton.className = 'bg-green-500 text-white p-2 rounded-md';
            addButton.textContent = '加入';
            addButton.addEventListener('click', () => {
                addStock({ name: stock["公司名稱"], code: stock["公司代號"] });
            });
            listItem.appendChild(addButton);

            resultsList.appendChild(listItem);
        });
    }

    function displayStockAccordion(stockImpactData, container) {
        Object.keys(stockImpactData).forEach(impactLevel => {
            stockImpactData[impactLevel].forEach(stock => {
                const accordionItem = document.createElement('div');
                accordionItem.className = 'accordion-item bg-gray-200 p-4 rounded-md mt-2 flex justify-between items-center';

                // 左侧显示股票代码和名称
                const stockInfoDiv = document.createElement('div');
                stockInfoDiv.className = 'flex flex-col';
                stockInfoDiv.innerHTML = `
                    <div><strong>股票代號:</strong> ${stock["股票代號"]}</div>
                    <div><strong>股票名稱:</strong> ${stock["股票名稱"]}</div>
                `;

                // 右侧显示影响标签
                const impactLabelDiv = document.createElement('div');
                impactLabelDiv.className = `border px-2 py-1 rounded ${impactLevel === '大' ? 'border-red-500 text-red-500' :
                    impactLevel === '中' ? 'border-yellow-500 text-yellow-500' :
                        'border-green-500 text-green-500'
                    }`;
                impactLabelDiv.textContent = impactLevel;

                // 原因部分
                const reasonDiv = document.createElement('div');
                reasonDiv.className = 'accordion-content mt-2 text-sm bg-white p-2 border rounded-md hidden';
                reasonDiv.innerHTML = `<strong>原因:</strong> ${stock["原因"]}`;

                // 点击显示/隐藏原因
                accordionItem.addEventListener('click', () => {
                    reasonDiv.classList.toggle('hidden');
                });

                accordionItem.appendChild(stockInfoDiv);
                accordionItem.appendChild(impactLabelDiv);
                container.appendChild(accordionItem);
                container.appendChild(reasonDiv);  // 原因显示在手风琴项之下
            });
        });
    }

    function addStock(stock) {
        if (!addedStocks.find(s => s.code === stock.code)) {
            addedStocks.push(stock);
            renderAddedStocks();
            fetchPredictions(stock);
        }
    }

    function removeStock(stockCode) {
        const index = addedStocks.findIndex(s => s.code === stockCode);
        if (index > -1) {
            addedStocks.splice(index, 1);
            renderAddedStocks();
            renderPredictions();
        }
    }

    function renderAddedStocks() {
        const addedStocksList = document.getElementById('addedStocksList');
        addedStocksList.innerHTML = '';
        addedStocks.forEach(stock => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center bg-gray-200 p-4 rounded-md';

            const stockInfo = document.createElement('div');
            stockInfo.innerHTML = `<strong>${stock.name}</strong> (${stock.code})`;
            listItem.appendChild(stockInfo);

            const removeButton = document.createElement('button');
            removeButton.className = 'bg-red-500 text-white p-2 rounded-md';
            removeButton.textContent = '删除';
            removeButton.addEventListener('click', () => {
                removeStock(stock.code);
            });
            listItem.appendChild(removeButton);

            addedStocksList.appendChild(listItem);
        });
    }

    function renderPredictions() {
        const predictionsList = document.getElementById('predictionsList');
        predictionsList.innerHTML = '';
        addedStocks.forEach(stock => {
            const row = document.createElement('tr');

            const codeCell = document.createElement('td');
            codeCell.className = 'py-2';
            codeCell.textContent = stock.code;
            row.appendChild(codeCell);

            const nameCell = document.createElement('td');
            nameCell.className = 'py-2';
            nameCell.textContent = stock.name;
            row.appendChild(nameCell);

            const predictionCell = document.createElement('td');
            predictionCell.className = 'py-2';
            // prediction = (Math.round((stock.prediction + Number.EPSILON) * 100) / 100).toFixed(2);
            prediction = stock.prediction.toFixed(2);
            predictionCell.textContent = stock.prediction ? `${prediction} 元` : '预测结果';
            row.appendChild(predictionCell);

            predictionsList.appendChild(row);
        });
    }

    function fetchPredictions(stock) {
        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stock_symbol: stock.code,
                start_date: '2023-01-01',
                end_date: '2024-12-04'
            })
        })
            .then(response => response.json())
            .then(data => {
                stock.prediction = data[0].Predicted_Price;
                renderPredictions();
            })
            .catch(error => {
                console.error('Error fetching predictions:', error);
            });
    }
});
