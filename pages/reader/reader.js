db.articles.toCollection().first(updatePage);

function updatePage(article) {
    document.querySelector("#title").innerHTML = article.title;
    document.querySelector("#byline").innerHTML = article.byline;
    document.querySelector("#original a").setAttribute("href", article.url);
    document.querySelector("#content").innerHTML = article.content;
    db.articles.clear();
}