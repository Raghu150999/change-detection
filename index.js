const ee = require('@google/earthengine');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const Utils = require('./utils/utils');

require('dotenv').config();

// Setup mongoose
mongoose.Promise = global.Promise;
const mongodb_uri = "mongodb://localhost/cddb";
mongoose.connect(mongodb_uri, { useNewUrlParser: true })
.catch(err => console.error(err));

const app = express()
const api = require('./routes/api')(app);
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(cors());
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
