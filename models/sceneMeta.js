let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let sceneMetaSchema = new Schema({
		coordinates: Array,
		rons: Array, // relativeOrbitNumbers start and stop
		isClipped: Boolean,
		geometry: Object
});

let SceneMeta = mongoose.model('sceneMetas', sceneMetaSchema);

module.exports = SceneMeta;