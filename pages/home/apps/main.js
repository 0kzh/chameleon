const numCards = 6;

const itemTemplate = `
<div class="item">
  <div class="icon">
    <img class="logo" src="">
  </div>
  <span class="title"></span>
</div>
`;

const defaultSites = [
  {
    url: "https://google.com/",
    favicon: "https://api.faviconkit.com/google.com/24",
    title: "Google"
  },
  {
    url: "https://youtube.com/",
    favicon: "https://api.faviconkit.com/youtube.com/24",
    title: "YouTube"
  },
  {
    url: "https://facebook.com/",
    favicon: "https://api.faviconkit.com/facebook.com/24",
    title: "Facebook"
  },
  {
    url: "https://wikipedia.com/",
    favicon: "https://api.faviconkit.com/wikipedia.com/24",
    title: "Wikipedia"
  },
  {
    url: "https://twitter.com/",
    favicon: "https://api.faviconkit.com/twitter.com/24",
    title: "Twitter"
  },
  {
    url: "https://instagram.com/",
    favicon: "https://api.faviconkit.com/instagram.com/24",
    title: "Instagram"
  },
]

var today = new Date()
var curHr = today.getHours()
let greeting;
let emoji;

if (curHr >= 5 && curHr < 12) {
  emoji = "🌅"
  greeting = "Good Morning"
} else if (curHr >= 12 && curHr < 18) {
  emoji = "🌤️"
  greeting = "Good Afternoon"
} else {
  emoji = "🌙"
  greeting = "Good Evening"
}

$("#emoji").html(emoji)
$(".tod").text(greeting)

db.sites.orderBy('numVisits').reverse().toArray(createQuickNav);
settings.get('name', (value) => {
  $('.name-input').hide();
  $('.name-input').val(value);
  $('.width-dynamic').css({
    width: $('.width-dynamic').textWidth()
  })
  $('.name-input').show();
})

function countSites(sites) {
  var count = 0;
  for (const site of sites) {
    if (!(site.title.startsWith("http") || site.title.startsWith("https"))) {
      count++;
    }

    if (count >= numCards) {
      break;
    }
  }
  return count >= numCards;
}

function createQuickNav (sites) {
  document.querySelector('.quick-nav').innerHTML = ''
  var enough = countSites(sites);
  for (var i = 0; i < numCards; i++) {
    const site = enough ? sites[i] : defaultSites[i];
    const div = document.createElement('div');
    div.innerHTML = itemTemplate;

    div.querySelector('.logo').setAttribute('src', site.favicon);
    div.querySelector('.title').innerHTML = site.title;
    div.querySelector('.item').addEventListener('click', () => {
      window.location = site.url;
    })
    document.querySelector('.quick-nav').appendChild(div.children[0]);
  }
}

$.fn.textWidth = function(text, font) {
  if (!$.fn.textWidth.fakeEl) $.fn.textWidth.fakeEl = $('<span>').hide().appendTo(document.body);
  $.fn.textWidth.fakeEl.text(text || this.val() || this.text() || this.attr('placeholder')).css('font', font || this.css('font'));
  return $.fn.textWidth.fakeEl.width();
};

$('.width-dynamic').on('input', function() {
  var inputWidth = $(this).textWidth();
  $(this).css({
      width: inputWidth + 5
  })
}).trigger('input');


function inputWidth(elem, minW, maxW) {
  elem = $(this);
  console.log(elem)
}

var targetElem = $('.width-dynamic');

inputWidth(targetElem);

$(".name-input").on('blur', () => {
  settings.set('name', $('.name-input').val())
});