document.addEventListener('DOMContentLoaded', function () {
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

    function rendernews(newsdata) {
        newslist = document.getElementById('newlist');
        newsdata.forEach((news) => {
            newstiem = changetime(news["publishAt"])
            tagslist = ""
            news["keyword"].forEach((tag) => {
                tagslist += `<span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">${tag}</span>`
            })
            newslist.innerHTML += `<a href="singlestock?newsid=${news["newsId"]}"
                        class="block hover:bg-gray-100 rounded-lg transition">
                        <div class="flex space-x-4 items-start border-b pb-4">
                            <!-- 時間與標題 -->
                            <div class="flex-1">
                                <p class="text-gray-500 text-sm mb-1">${newstiem}  ${news["categoryName"]}</p>
                                <h2 class="text-gray-800 font-semibold mb-2">${news["title"]}</h2>
                                <!-- 標籤 -->
                                <div class="flex flex-wrap gap-2">
                                    ${tagslist}
                                </div> 
                            </div>
                            <!-- 圖片 -->
                            <div class="w-24 h-16 flex-shrink-0 bg-gray-200 rounded-lg overflow-hidden">
                                <img src="${news["coverSrc"]["l"]["src"]}" alt="新聞圖片"
                                    class="object-cover w-full h-full" />
                            </div>
                        </div>
                    </a>`
        });
    }

    function getnews() {
        fetch(`/getnews`)
            .then(response => response.json())
            .then(data => {
                rendernews(data["data"]);
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            });
    }
    getnews()
})