var db = require('../../js/history-db.js');
var $ = require('jquery');

const entryTemplate = `
  <div class="entry">
    <div class="timestamp"></div>
	<div class="favicon"><img src=""/></div>
	<div class="title"><a href=""></a></div>
	<div class="site"></div>
	<a href="" class="far fa-minus-square delete"></a>
  </div>
`;
db.sites.reverse().each(site => {
  const div = document.createElement('div');
  div.innerHTML = entryTemplate;
  div.querySelector(".timestamp").innerHTML = formatTime(new Date(site.lastVisit));
  div.querySelector(".favicon img").setAttribute("src", site.favicon);
  div.querySelector(".title a").innerHTML = site.title;
  div.querySelector(".title a").setAttribute("href", site.url);
  div.querySelector(".site").innerHTML = stripURL(site.url);
  document.querySelector(".card-body").appendChild(div);
});

function formatTime(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0' + minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}

function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf("://") > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

function stripURL(url) {
  //if ip address, don't strip
  var ipAddress = new RegExp(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(:[0-9]{1,4})?$/);
  if (ipAddress.test(extractHostname(url))) {
    return extractHostname(url);
  }

  //if pdf or file, leave file name
  if (url.startsWith("chrome://pdf-viewer/index.html?src=") || url.startsWith("file:///")) {
    return decodeURI(url.split("/")[url.split("/").length - 1]);
  }

  var domain = extractHostname(url),
    splitArr = domain.split('.'),
    arrLen = splitArr.length;

  //extracting the root domain here
  //if there is a subdomain 
  if (arrLen > 2) {
    domain = splitArr[arrLen - 2] + '.' + splitArr[arrLen - 1];
    //check to see if it's using a Country Code Top Level Domain (ccTLD) (i.e. ".me.uk")
    if (splitArr[arrLen - 2].length == 2 && splitArr[arrLen - 1].length == 2) {
      //this is using a ccTLD
      domain = splitArr[arrLen - 3] + '.' + domain;
    }
  }
  return domain;
}

$(document).on("mouseenter mouseleave", ".delete", (event) => {
  var element = $(event.target);
  if (element.hasClass("fas")) {
    element.removeClass("fas").addClass("far");
  } else {
    element.removeClass("far").addClass("fas");
  }
});