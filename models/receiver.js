let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let receiverSchema = new Schema({
    receiverEmail: String,
    password: String
});

let Receiver = mongoose.model('receivers', receiverSchema);

module.exports = Receiver;