var settingsDB = new Dexie("settings");
settingsDB.version(1).stores({
  settings: "key, value"
});

settingsDB.open().catch (function (err) {
    console.error('Failed to open db: ' + (err.stack || err));
});

var settings = {
	loaded: false,
	list: {},
	onLoadCallbacks: [],
	get: function(key, cb) {
		// load from cache if possible
		if (settings.loaded) {
			cb(settings.list[key]);
		} else {
			settingsDB.settings.where('key').equals(key).first((item) => {
				if (item) {
					cb(item.value);
				} else {
					cb(null);
				}
			});
		}
	},
	set: function(key, value) {
		settingsDB.settings.put({ key: key, value: value});
	},
	load: function() {
		settingsDB.settings.each((setting) => {
			settings.list[setting.key] = setting.value;
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