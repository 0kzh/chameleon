var locationValue = $('#location').val();
var autocomplete = $("#autocomplete");

historyWrapper.onLoad(loadHistory)

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

function updateAutocomplete(sites) {
    console.log(sites)
}

$("#location").on('input propertychange paste', () => {
    locationValue = $('#location').val();
    loadHistory();
})

$("#location").on("focus", () => {
    autocomplete.show();
})

$("#location").on("blur", () => {
    autocomplete.hide();
})

function displaySites (sites) {
    document.querySelector('#autocomplete').innerHTML = ''
    for (let i = 0; i < 3; i++) {
        const site = sites[i]
        const div = document.createElement('div')
        div.innerHTML = entryTemplate

        div.querySelector('.favicon img').setAttribute('src', site.favicon)
        div.querySelector('.title').innerHTML = site.title
        div.querySelector('.link').innerHTML = site.url
        div.querySelector('.ac-entry').addEventListener('click', () => {
            window.location = site.url;
        })
        document.querySelector('#autocomplete').appendChild(div.children[0]);
    }
}

function loadHistory() {
    historyWrapper.search(locationValue, displaySites);
}
