if (typeof Dexie === 'undefined' && typeof require !== 'undefined') {
  var Dexie = require('dexie')
}

var db = new Dexie('history')
db.version(1).stores({
  sites: '++id,url,favicon,title,lastVisit,numVisits',
  articles: 'title,byline,content,length,url' // there should only be one article at any given time
})

db.open().catch(function (err) {
  console.error('Failed to open db: ' + (err.stack || err))
})

var historyWrapper = {
  loaded: false,
  list: {},
  onLoadCallbacks: [],
  get: function (key, cb) {
    // load from cache if possible
    if (historyWrapper.loaded) {
      cb(historyWrapper.list[key])
    } else {
      db.sites.where('key').equals(key).first((item) => {
        if (item) {
          cb(item.value)
        } else {
          cb(null)
        }
      })
    }
  },
  set: function (key, value) {
    db.sites.put({ key: key, value: value })
  },
  search: function(key) {
    return db.sites.orderBy('numVisits').reverse().filter(site => {
      console.log(stripURL(site.url))
      return site.title.startsWith(key) || stripURL(site.url).startsWith(key) && !site.title.startsWith('http')
    }).toArray()
  },
  load: function () {
    db.sites.each(() => {
      db.list[historyWrapper.key] = historyWrapper.value
    }).then(() => {
      historyWrapper.loaded = true
      historyWrapper.onLoadCallbacks.forEach((item) => {
        item.cb(historyWrapper.list[item.key])
      })
      historyWrapper.onLoadCallbacks = []
    })
  },
  onLoad: function (cb) {
    if (historyWrapper.loaded) {
      cb()
    } else {
      historyWrapper.onLoadCallbacks.push({
        key: '',
        cb: cb
      })
    }
  }
}

historyWrapper.load()