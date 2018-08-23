if (typeof Dexie === 'undefined' && typeof require !== 'undefined') {
  var Dexie = require('dexie')
}

var db = new Dexie("history");
db.version(1).stores({
  sites: "++id,url,favicon,title,lastVisit,numVisits"
});

db.open().catch (function (err) {
    console.error('Failed to open db: ' + (err.stack || err));
});