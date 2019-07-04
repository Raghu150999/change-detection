let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let sceneSchema = new Schema({
		sceneMetaID: String,
		locationName: String,
		sceneID: String,
		collectionID: String,
		acquisitionDate: Date
});

let Scene = mongoose.model('scenes', sceneSchema);

module.exports = Scene;