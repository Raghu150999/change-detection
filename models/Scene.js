let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let sceneSchema = new Schema({
		sceneMetaID: String,
		locationName: String,
		sceneID: String,
		acquisitionDate: Date,
		footprint: Array,
		point: Array,
		collectionID: String
});

let Scene = mongoose.model('scenes', sceneSchema);

module.exports = Scene;