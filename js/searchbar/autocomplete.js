var locationValue = $('#location').val();
var autocomplete = $("#autocomplete");

const googleQueryURL = 'http://suggestqueries.google.com/complete/search?q=';
const postfix = '&client=toolbar';

// historyWrapper.onLoad(loadHistory)

const entryTemplate = `
    <div class="ac-entry">
        <div class="favicon">
            <img class="logo" src="">
        </div>
        <span class="title"></span>
        <span class="separator">-</span>
        <span class="link"></span>
    </div>
`

$("#location").on('input propertychange paste', () => {
    locationValue = $("#location").val();
    if (locationValue) {
        autocomplete.show();
        const searchPromise = getSearchResults(locationValue);
        const historyPromise = historyWrapper.search(locationValue);
        Promise.all([searchPromise, historyPromise]).then(res => {
            list = []
            // push first website result first
            searchResults = res[0]
            historyResults = res[1]
            console.log(historyResults)
            if (history != undefined && historyResults[0] != undefined) {
                list.push(historyResults[0]);
            }

            const searchResultCount = historyResults.length == 0 ? 8 : 3;
            const truncated = searchResults[1].slice(0, searchResultCount);
            
            for (var entry of truncated) {
                o = {
                    url: "https://google.com/search?q=" + entry,
                    favicon: "https://api.faviconkit.com/google.com/24",
                    title: entry,
                    lastVisit: -1,
                    numVisits: 1,
                    id: -1,
                }
                list.push(o)
            }
            list = list.concat(historyResults.slice(0, 4));
            displaySites(list);
        }) 
    } else {
        autocomplete.hide();
    }
})

$("#location").on("focus", () => {
    autocomplete.show();
})

$("#location").on("blur", (e) => {
    // we gotta set a timeout here since click triggers after blur
    setTimeout(() => {
        autocomplete.hide();
    }, 100)
})

$(".ac-entry").on("click", () => {
    autocomplete.hide();
})

var suggestCallBack;
function getSearchResults(query) {
    return new Promise((resolve, reject) => {
        $.getJSON("http://suggestqueries.google.com/complete/search?callback=?",
            {
                "hl": "en",
                "jsonp": "suggestCallBack",
                "q": query,
                "client": "firefox"
            }
        );
        
        suggestCallBack = function (data) {
            resolve(data);
        };
    });
}

function displaySites (sites) {
    document.querySelector('#autocomplete').innerHTML = ''
    for (let i = 0; i < 8; i++) {
        const site = sites[i]
        const div = document.createElement('div')
        div.innerHTML = entryTemplate

        div.querySelector('.favicon img').setAttribute('src', site.favicon)
        div.querySelector('.title').innerHTML = site.title
        div.querySelector('.link').innerHTML = site.url
        div.querySelector('.ac-entry').addEventListener('click', () => {
            navigateTo(site.url);
        })
        document.querySelector('#autocomplete').appendChild(div.children[0]);
    }
}
