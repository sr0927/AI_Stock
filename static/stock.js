document.addEventListener('DOMContentLoaded', function () {
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
                console.log(data);
                render_stock_data(data[0]["公司代號"])
                intro_render(data);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    })
    function intro_render(data) {
        document.getElementById("intro-name").innerHTML = data[0]["公司名稱"]
        document.getElementById("intro-english").innerHTML = data[0]["英文簡稱"]
        document.getElementById("intro-owner").innerHTML = data[0]["董事長"]
        document.getElementById("intro-ceo").innerHTML = data[0]["總經理"]
        document.getElementById("intro-say").innerHTML = data[0]["發言人"]
        document.getElementById("intro-day").innerHTML = data[0]["成立日期"]
        document.getElementById("intro-up").innerHTML = data[0]["上市日期"]
        document.getElementById("intro-money").innerHTML = data[0]["實收資本額"]
        document.getElementById("intro-addr").innerHTML = data[0]["住址"]
        document.getElementById("intro-call").innerHTML = data[0]["過戶地址"]
        document.getElementById("intro-phone").innerHTML = data[0]["總機電話"]
        document.getElementById("intro-callphone").innerHTML = data[0]["過戶電話"]
        document.getElementById("intro-email").innerHTML = data[0]["電子郵件信箱"]
    }

    function render_stock_data(num) {
        datatitle = document.getElementById("stock-title")
        datalist = document.getElementById("stock-data")
        fetch(`/getstockdata?query=${num}`)
            .then(response => response.json())
            .then(data => {
                console.log(data)
                if (data["股價升降"] == "up" || data["股價升降"] == "upfull") {
                    color = "red"
                    mark = '<span class="triangle" style="display: inline-block; border-style: solid; border-width: 0 6.5px 9px 6.5px; border-color: transparent transparent #ff333a transparent; margin-top: 4px;"></span>'
                    //mark = '<span class="Mend(4px) Bds(s)" style="border-color:transparent transparent #ff333a transparent;border-width:0 6.5px 9px 6.5px"></span>'
                } else if (data["股價升降"] == "down" || data["股價升降"] == "downfull") {
                    color = "green"
                    mark = '<span class="triangle" style="display: inline-block; border-style: solid; border-width: 9px 6.5px 0 6.5px; border-color: #00ab5e transparent transparent transparent; margin-top: 4px;"></span>'
                    //mark = '<span class="Mend(4px) Bds(s)" style="border-color:#00ab5e transparent transparent transparent;border-width:9px 6.5px 0 6.5px"></span>'
                } else {
                    color = "gray"
                    mark = ''
                }
                datatitle.innerHTML = `<!-- 左側股票資訊 -->
                    <div class="flex-wrap">
                        <div class="flex items-baseline space-x-2">
                            <h2 class="text-gray-800 font-bold text-lg">${data["股票名稱"]}</h2>
                            <span class="text-gray-500 text-sm">${data["股票代號"]}</span>
                        </div>
                        <div class="text-${color}-600 font-bold text-3xl mt-2">${data["股價"]}
                            <span class="text-${color}-600 text-lg font-normal content-center">${mark} ${data["上升"]} ${data["上升百分比"]}</span>
                        </div>
                        <div class="text-gray-500 text-sm mt-1">${data["更新時間"]}</div>
                    </div>

                    <!-- 右側成交量與本益比 -->
                    <div class="text-right flex items-center justify-between flex-nowrap mt-4">
                        <div class="mr-3">
                            <div class="text-gray-800 text-lg font-bold">${data["成交量"]}</div>
                            <div class="text-gray-500 text-sm">成交量</div>
                        </div>
                        <div class="ml-3">
                            <div class="">
                                <span class="text-gray-800 text-lg font-bold">${data["本益比"]}</span>
                            </div>
                            <div class="text-gray-500 text-sm">本益比 (同業平均)</div>
                        </div>
                    </div>`

                datalist.innerHTML = `<div class="grid grid-cols-2 gap-4 text-gray-800 text-sm">
                <div>
                    <p>成交</p>
                    <p class="font-bold text-${data["資訊升降"]["成交"]}-600">${data["成交資訊"]["成交"]}</p>
                </div>
                <div>
                    <p>昨收</p>
                    <p class="font-bold text-${data["資訊升降"]["昨收"]}-800">${data["成交資訊"]["昨收"]}</p>
                </div>
                <div>
                    <p>開盤</p>
                    <p class="font-bold text-${data["資訊升降"]["開盤"]}-600">${data["成交資訊"]["開盤"]}</p>
                </div>
                <div>
                    <p>漲跌幅</p>
                    <p class="font-bold text-${data["資訊升降"]["漲跌幅"]}-600">${data["成交資訊"]["漲跌幅"]}</p>
                </div>
                <div>
                    <p>最高</p>
                    <p class="font-bold text-${data["資訊升降"]["漲跌"]}-600">${data["成交資訊"]["最高"]}</p>
                </div>
                <div>
                    <p>漲跌</p>
                    <p class="font-bold text-${data["資訊升降"]["漲跌"]}-600">${data["成交資訊"]["漲跌"]}</p>
                </div>
                <div>
                    <p>最低</p>
                    <p class="font-bold text-${data["資訊升降"]["最低"]}-600">${data["成交資訊"]["最低"]}</p>
                </div>
                <div>
                    <p>總量</p>
                    <p class="font-bold text-${data["資訊升降"]["總量"]}-800">${data["成交資訊"]["總量"]}</p>
                </div>
                <div>
                    <p>均價</p>
                    <p class="font-bold text-${data["資訊升降"]["均價"]}-800">${data["成交資訊"]["均價"]}</p>
                </div>
                <div>
                    <p>昨量</p>
                    <p class="font-bold text-${data["資訊升降"]["昨量"]}-800">${data["成交資訊"]["昨量"]}</p>
                </div>
                <div>
                    <p>成交金額(億)</p>
                    <p class="font-bold text-${data["資訊升降"]["成交金額(億)"]}-800">${data["成交資訊"]["成交金額(億)"]}</p>
                </div>
                <div>
                    <p>振幅</p>
                    <p class="font-bold text-${data["資訊升降"]["振幅"]}-800">${data["成交資訊"]["振幅"]}</p>
                </div>
            </div>

            <!-- 內外盤對比條 -->
            <div class="mt-6">
                <div class="flex justify-between items-center">
                    <p class="text-green-600 font-bold">內盤 ${data["內外盤"]["內盤"]} (${data["內外盤"]["內盤百分比"]})</p>
                    <p class="text-red-600 font-bold">外盤 ${data["內外盤"]["外盤"]} (${data["內外盤"]["外盤百分比"]})</p>
                </div>
                <div class="relative w-full bg-gray-200 h-2 rounded-full mt-2">
                    <div class="absolute left-0 h-2 bg-green-500 rounded-l-full" style="width: ${data["內外盤"]["內盤百分比"]};">
                    </div>
                    <div class="absolute right-0 h-2 bg-red-500 rounded-r-full" style="width: ${data["內外盤"]["外盤百分比"]}">
                    </div>
                </div>
            </div>

            <!-- 委託買賣表 -->
            <div class="bg-white shadow-md rounded-lg p-6">
                <!-- 委託買賣表 -->
                <div class="mt-6 grid grid-cols-4 gap-4 text-sm">
                    <!-- 買盤量 -->
                    <div>
                        <p class="text-center text-gray-600">量</p>
                        <ul class="space-y-1">
                            <li class="text-center">${data["委買"]["明細"][0]["數量"]}</li>
                            <li class="text-center">${data["委買"]["明細"][1]["數量"]}</li>
                            <li class="text-center">${data["委買"]["明細"][2]["數量"]}</li>
                            <li class="text-center">${data["委買"]["明細"][3]["數量"]}</li>
                            <li class="text-center">${data["委買"]["明細"][4]["數量"]}</li>
                        </ul>
                        <hr>
                        <p class="text-center font-bold mt-2">${data["委買"]["小計"]}</p>
                    </div>
                    <!-- 委買價 -->
                    <div>
                        <p class="text-center text-gray-600">委買價</p>
                        <ul class="space-y-1">
                            <li class="text-center bg-blue-100 rounded">${data["委買"]["明細"][0]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委買"]["明細"][1]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委買"]["明細"][2]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委買"]["明細"][3]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委買"]["明細"][4]["價格"]}</li>
                        </ul>
                    </div>
                    <!-- 委賣價 -->
                    <div>
                        <p class="text-center text-gray-600">委賣價</p>
                        <ul class="space-y-1">
                            <li class="text-center bg-blue-100 rounded">${data["委賣"]["明細"][0]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委賣"]["明細"][1]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委賣"]["明細"][2]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委賣"]["明細"][3]["價格"]}</li>
                            <li class="text-center bg-blue-100 rounded">${data["委賣"]["明細"][4]["價格"]}</li>
                        </ul>
                    </div>
                    <!-- 賣盤量 -->
                    <div>
                        <p class="text-center text-gray-600">量</p>
                        <ul class="space-y-1">
                            <li class="text-center">${data["委賣"]["明細"][0]["數量"]}</li>
                            <li class="text-center">${data["委賣"]["明細"][1]["數量"]}</li>
                            <li class="text-center">${data["委賣"]["明細"][2]["數量"]}</li>
                            <li class="text-center">${data["委賣"]["明細"][3]["數量"]}</li>
                            <li class="text-center">${data["委賣"]["明細"][4]["數量"]}</li>
                        </ul>
                        <hr>
                        <p class="text-center font-bold mt-2">${data["委賣"]["小計"]}</p>
                    </div>
                </div>
            </div>`
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });


    }
})