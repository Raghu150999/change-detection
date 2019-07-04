const ee = require('@google/earthengine');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Utils = require('./utils/utils');
const SceneMeta = require('./models/sceneMeta');

// Note: Don't use cors unless you are making cross origin request for ex: if your client makes request to server other than the origin (i.e. is the default domain) (see project BESit1)

require('dotenv').config();

// Setup mongoose
mongoose.Promise = global.Promise;
const mongodb_uri = "mongodb://localhost/cddb";
mongoose.connect(mongodb_uri, { useNewUrlParser: true })
.catch(err => console.error(err));
mongoose.set('useFindAndModify', false);

const app = express()
const api = require('./routes/api')(app);
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

// Always route after use all necessary middlewares
app.use('/api', api);

// Private key, in `.json` format, for an Earth Engine service account.
const PRIVATE_KEY = require('./privatekey.json');
const PORT = process.env.PORT || 3000;

// For developing front-end GEE calls are very slow
// app.listen(PORT);
// console.log(`Listening on port ${PORT}`);

// Earth Engine api call use when testing ee code
ee.data.authenticateViaPrivateKey(PRIVATE_KEY, () => {
  ee.initialize(null, null, () => {
    app.listen(PORT);
		console.log(`Listening on port ${PORT}`);
		app.locals.trained = Utils.getClassifier();
  }, function(e) {
      console.log(e)
  });
});

app.get('/', (req, res) => {
	res.render('index');
})

let websiteDomain = 'www.website.com';

// Checks for data every 6 hours and sends alert emails
setInterval(function () {
  SceneMeta.find({})
    .then(result => {
      result.forEach(sceneMeta => {
        let d = new Date();
        let locationName = sceneMeta.locationName;
        let ed = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
        var images = Utils.getImages(sceneMeta, '2015-01-01', ed);
        images = images.sort('segmentStartTime', false);
        var list = images.toList(300);
        var len = list.length().getInfo();
        var orlen = sceneMeta.scenesAcquired;
        if (len > orlen) {
          SceneMeta.findOneAndUpdate({_id: sceneMeta._id}, { $set: {scenesAcquired: len}})
          let subject = 'New Data Available';
          let text = 'New data has been acquired for ' + locationName + ' for the following acquistion date(s):\n\n';
          for (var i = 0; i < len - orlen; i++) {
            var image = ee.Image(list.get(i));
            var date = new Date(image.toDictionary().get('segmentStartTime').getInfo());
            text += '\t' + date + '\n\n';
          }
          text += '\n\n'
          text += 'Please visit ' + websiteDomain + ' for more details\n';
          Utils.sendMail(subject, text);
        }
      })
    })
}, 21600000)

// setInterval(function() {
//   Utils.sendMail('Test', 'Hi,\nThis is just a test email');
// }, 10000)
