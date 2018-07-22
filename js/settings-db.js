if (typeof Dexie === 'undefined' && typeof require !== 'undefined') {
  var Dexie = require('dexie')
}

var db = new Dexie("settings");
db.version(1).stores({
  settings: "key, value"
});

db.open().catch (function (err) {
    console.error('Failed to open db: ' + (err.stack || err));
});

var settings = {
	loaded: false,
	list: {},
	onLoadCallbacks: [],
	get: function(key, cb) {
		db.settings.where('key').equals(key).first((item) => {
			cb(item.value);
		});
	},
	set: function(key, value) {
		db.settings.put({ key: key, value: value});
	},
	load: function() {
		db.settings.each((setting) => {
			settings.list[settings.key] = setting.value;
		}).then(() => {
			settings.loaded = true;
			settings.onLoadCallbacks.forEach((item) => {
				item.cb(settings.list[item.key])
			});
			settings.onLoadCallbacks = [];
		});
	},
	onLoad: function(cb) {
		if (settings.loaded) {
			cb();
		} else {
			settings.onLoadCallbacks.push({
        key: '',
        cb: cb
      })
		}
	}
}

settings.load();

if (typeof module !== 'undefined') {
  module.exports = settings
}