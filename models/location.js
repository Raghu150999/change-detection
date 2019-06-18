let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let locationSchema = new Schema({
    locationName: String,
    sceneMetas: Array
});

let Location = mongoose.model('locations', locationSchema);

module.exports = Location;