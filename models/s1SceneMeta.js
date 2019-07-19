let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let sceneMetaSchema = new Schema({
  state: String,
  locationName: String,
  point: Array,
  rons: Array,
  scenesAcquired: Number,
  scenes: Array
});

let SceneMeta = mongoose.model('s1scenemeta', sceneMetaSchema);

module.exports = SceneMeta;