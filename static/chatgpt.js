document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("chat-form").addEventListener('submit', (e) => {
        function getchat(chat_content, callback) {
            fetch(`/getchat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    chat: chat_content
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    // 返回 response.text()，這也是一個 Promise
                    return response.text();
                })
                .then(data => {
                    // 模擬延遲的 Promise
                    const delayedPromise = new Promise(resolve => {
                        setTimeout(() => {
                            resolve(data); // 返回原始數據
                        }, 1000);
                    });
                    return delayedPromise;
                })
                .then(delayedData => {
                    // 打印延遲處理後的數據
                    callback(null, delayedData);
                    // console.log("Final Data:", delayedData);
                })
                .catch(error => {
                    console.error('Error fetching data:', error);
                    callback(error, null);
                });
        }
        e.preventDefault();
        let chat_result
        chat_box = document.getElementById("chat-box");
        chat_content = document.getElementById("chat-input").value.trim();
        document.getElementById("chat-input").value = ""
        chat_box.innerHTML += `<div class="flex items-end justify-end space-x-2">
                                <div class="bg-green-100 text-gray-800 p-3 rounded-lg max-w-xs">
                                    <p>${chat_content}</p>
                                </div>
                                <div
                                    class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
                                U</div>
                            </div>`;
        getchat(chat_content, (error, result) => {
            if (error) {
                console.error("Error:", error);
            } else {
                chat_result = result
                chat_box.innerHTML += `<div class="flex items-start space-x-2">
                                <div
                                    class="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm">
                                    A</div>
                                <div class="bg-blue-100 text-gray-800 p-3 rounded-lg max-w-xs">
                                    <p>${chat_result}</p>
                                </div>
                            </div>`
            }
        })
    })


})