let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let s2SceneMetaSchema = new Schema({
	state: String,
	point: Array,
	orbit: Number,
	scenesAcquired: Number,
	locationName: String,
	scenes: Array
});

let s2SceneMeta = mongoose.model('s2scenemetas', s2SceneMetaSchema);

module.exports = s2SceneMeta;