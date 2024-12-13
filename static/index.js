document.addEventListener('DOMContentLoaded', function () {
    function rendernews(newsdata) {
        newslist = document.getElementById('newslist');
        newsdata.forEach((news) => {
            newslist.innerHTML += `<li class="hover:bg-gray-200 text-sm text-gray-700">
                                    <a class="" href="singlestock?newsid=${news["newsId"]}">${news["title"]}</a>
                                    </li>
                                    <hr>`
        })

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