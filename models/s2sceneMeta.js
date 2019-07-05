let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let s2SceneMetaSchema = new Schema({
	point: Array,
	orbit: Number,
	scenesAcquired: Number,
	locationName: String,
	scenes: Array,
	footprint: Array
});

let s2SceneMeta = mongoose.model('s2sceneMetas', s2SceneMetaSchema);

module.exports = s2SceneMeta;