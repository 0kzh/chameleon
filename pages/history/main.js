const entryTemplate = `
  <div class="entry">
    <div class="timestamp"></div>
    <div class="favicon"><img src=""/></div>
    <div class="title"><a href=""></a></div>
    <div class="site"></div>
    <i class="far fa-minus-square delete"></i>
  </div>
`;

const dateTemplate = `
  <h5 class="card-title date"></h5>
  <hr>
`;

settings.get('theme', (value) => {
  if (value == 'dark') {
    $('head').append('<link rel="stylesheet" href="../../vendor/bootstrap_dark.min.css" type="text/css" />');
  }
});

db.sites.orderBy('lastVisit').reverse().toArray(displaySites);

function displaySites(sites) {
  document.querySelector(".card-body").innerHTML = '';
  let dateString;
  for (let i = 0; i < sites.length; i++) {
    let site = sites[i];
    const div = document.createElement('div');
    div.innerHTML = entryTemplate;
    const date = new Date(site.lastVisit);
    if (dateString != formatDate(date)) {
      dateString = formatDate(date)
      const separator = document.createElement('div');
      separator.innerHTML = dateTemplate;
      separator.querySelector(".date").innerHTML = dateString;
      while (separator.children.length > 0) {
       document.querySelector(".card-body").appendChild(separator.children[0]);
      }
    }

    div.querySelector(".entry").setAttribute("id", site.id);
    div.querySelector(".timestamp").innerHTML = formatTime(new Date(site.lastVisit));
    div.querySelector(".favicon img").setAttribute("src", site.favicon);
    div.querySelector(".title a").innerHTML = site.title;
    div.querySelector(".title a").setAttribute("href", site.url);
    div.querySelector(".site").innerHTML = stripURL(site.url);
    while (div.children.length > 0) {
       document.querySelector(".card-body").appendChild(div.children[0]);
    }
  }
}

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

function formatDate(date) {
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();

  return monthNames[monthIndex] + " " + day + ", " + year;
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

$(document).on("mouseenter mouseleave", ".delete", event => {
  const element = $(event.target);
  if (element.hasClass("fas")) {
    element.removeClass("fas").addClass("far");
  } else {
    element.removeClass("far").addClass("fas");
  }
});

$(document).on("click", ".delete", event => {
  const element = $(event.target);
  //get unique site id
  const id = parseInt(element.parent().attr("id"));
  //remove from database
  db.sites.where('id').equals(id).delete().then(function(deleteCount) {
    if (deleteCount === 1){
      //if item deleted, remove from screen
      element.parent().remove();
    }
  }).catch(function(error) {
    console.error("Error deleting site: " + error);
  });
});

$("#clear-history").on("click", event => {
  const element = $(event.target);
  //empty database
  db.sites.clear().then(function() {
    //if successful, re-render everything (should be empty)
    db.sites.orderBy('lastVisit').reverse().toArray(displaySites);
  }).catch(function(error) {
    console.error("Error deleting site: " + error);
  });
});

$(document).on("input propertychange paste", ".search", event => {
  const element = $(event.target);
  const value = element.val();
  db.sites.orderBy('lastVisit').reverse().filter(site => {
    return site.title.includes(value) || site.url.includes(value)
  }).toArray(displaySites);
});