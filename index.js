const ee = require('@google/earthengine');
const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
const api = require('./routes/api');

require('dotenv').config();

// Setup mongoose
mongoose.Promise = global.Promise;
const mongodb_uri = "mongodb://localhost/cddb";
mongoose.connect(mongodb_uri, { useNewUrlParser: true })
.catch(err => console.error(err));

const app = express()
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

app.listen(PORT);
console.log(`Listening on port ${PORT}`);


// Earth Engine api call use when testing ee code
// ee.data.authenticateViaPrivateKey(PRIVATE_KEY, () => {
//   ee.initialize(null, null, () => {
//     app.listen(PORT);
// 		console.log(`Listening on port ${PORT}`);
//     // image.getMap({min: 0, max: 1000}, ({mapid, token}) => {
//     //   response.render('index', {mapid, token});
// 		// });
//   }, function(e) {
//       console.log(e)
//   });
// });

app.get('/', (req, res) => {
	res.render('index');
})

app.get('/getdata', (req, res) => {

	var sentinel1 = ee.ImageCollection("COPERNICUS/S1_GRD")

	// Training data point
	var point = /* color: #0b4a8b */ee.Geometry.Point([91.24258017163709, 26.121384377955213])

	var imageVisParam = {
		bands: ['classification'], 
		min: 0,
		max: 1, 
		palette: ['68dae6', 'a5611b']
	}

	// Date: 14/07/18
	var images = sentinel1.filterDate('2018-07-14', '2018-07-31').filterBounds(point).filter(ee.Filter.eq('relativeOrbitNumber_start', 150)).filter(ee.Filter.eq('relativeOrbitNumber_stop', 150))
	var image = images.first()

	var water = /* color: #d63000 */ee.FeatureCollection(
		[ee.Feature(
				ee.Geometry.Point([90.51415050481376, 26.224601395008047]),
				{
					"class": 0,
					"system:index": "0"
				}),
		ee.Feature(
				ee.Geometry.Point([90.73250377629813, 26.203040510297463]),
				{
					"class": 0,
					"system:index": "1"
				}),
		ee.Feature(
				ee.Geometry.Point([90.80460155461844, 26.179627028059645]),
				{
					"class": 0,
					"system:index": "2"
				}),
		ee.Feature(
				ee.Geometry.Point([90.94055736516532, 26.205504813577445]),
				{
					"class": 0,
					"system:index": "3"
				}),
		ee.Feature(
				ee.Geometry.Point([91.10324238710655, 26.230189795189563]),
				{
					"class": 0,
					"system:index": "4"
				}),
		ee.Feature(
				ee.Geometry.Point([91.39300341779222, 26.159785643345266]),
				{
					"class": 0,
					"system:index": "5"
				}),
		ee.Feature(
				ee.Geometry.Point([91.64610091244958, 26.175610563398592]),
				{
					"class": 0,
					"system:index": "6"
				}),
		ee.Feature(
				ee.Geometry.Point([91.52387801205896, 26.12691843598932]),
				{
					"class": 0,
					"system:index": "7"
				}),
		ee.Feature(
				ee.Geometry.Point([91.05009261166833, 26.077589260862062]),
				{
					"class": 0,
					"system:index": "8"
				}),
		ee.Feature(
				ee.Geometry.Point([90.85827108386161, 26.069581168328035]),
				{
					"class": 0,
					"system:index": "9"
				}),
		ee.Feature(
				ee.Geometry.Point([90.67998339642543, 26.166019944065685]),
				{
					"class": 0,
					"system:index": "10"
				}),
		ee.Feature(
				ee.Geometry.Point([90.59252672714683, 26.206435850419457]),
				{
					"class": 0,
					"system:index": "11"
				}),
		ee.Feature(
				ee.Geometry.Point([90.43001134924918, 26.17069863458347]),
				{
					"class": 0,
					"system:index": "12"
				}),
		ee.Feature(
				ee.Geometry.Point([90.38812597327262, 26.116455730697563]),
				{
					"class": 0,
					"system:index": "13"
				}),
		ee.Feature(
				ee.Geometry.Point([90.32278140085896, 26.142334406289343]),
				{
					"class": 0,
					"system:index": "14"
				}),
		ee.Feature(
				ee.Geometry.Point([90.31660159128865, 26.109660465021403]),
				{
					"class": 0,
					"system:index": "15"
				}),
		ee.Feature(
				ee.Geometry.Point([90.30080874460896, 26.088695013372057]),
				{
					"class": 0,
					"system:index": "16"
				}),
		ee.Feature(
				ee.Geometry.Point([90.3303345014449, 26.14295080789347]),
				{
					"class": 0,
					"system:index": "17"
				}),
		ee.Feature(
				ee.Geometry.Point([90.18700531089894, 26.073893608861223]),
				{
					"class": 0,
					"system:index": "18"
				}),
		ee.Feature(
				ee.Geometry.Point([90.12097154662786, 26.042597952801817]),
				{
					"class": 0,
					"system:index": "19"
				}),
		ee.Feature(
				ee.Geometry.Point([90.04843666197871, 25.907621893812607]),
				{
					"class": 0,
					"system:index": "20"
				}),
		ee.Feature(
				ee.Geometry.Point([90.91947655329727, 26.487595720509308]),
				{
					"class": 0,
					"system:index": "21"
				}),
		ee.Feature(
				ee.Geometry.Point([90.38367187980191, 26.2797810312163]),
				{
					"class": 0,
					"system:index": "22"
				}),
		ee.Feature(
				ee.Geometry.Point([89.74671313788417, 25.720933206298184]),
				{
					"class": 0,
					"system:index": "23"
				}),
		ee.Feature(
				ee.Geometry.Point([89.74121997382167, 25.665245133465547]),
				{
					"class": 0,
					"system:index": "24"
				}),
		ee.Feature(
				ee.Geometry.Point([89.75083301093105, 25.54393011242651]),
				{
					"class": 0,
					"system:index": "25"
				}),
		ee.Feature(
				ee.Geometry.Point([89.69115832883745, 25.327730188013664]),
				{
					"class": 0,
					"system:index": "26"
				}),
		ee.Feature(
				ee.Geometry.Point([89.66369250852495, 25.490229046908915]),
				{
					"class": 0,
					"system:index": "27"
				}),
		ee.Feature(
				ee.Geometry.Point([89.70107831885434, 25.642196717764875]),
				{
					"class": 0,
					"system:index": "28"
				}),
		ee.Feature(
				ee.Geometry.Point([89.76012983252622, 25.824049789028802]),
				{
					"class": 0,
					"system:index": "29"
				}),
		ee.Feature(
				ee.Geometry.Point([91.05832606878653, 25.14793902235203]),
				{
					"class": 0,
					"system:index": "30"
				}),
		ee.Feature(
				ee.Geometry.Point([91.1503365668334, 25.123074057679975]),
				{
					"class": 0,
					"system:index": "31"
				}),
		ee.Feature(
				ee.Geometry.Point([91.19840175238028, 25.074572822901306]),
				{
					"class": 0,
					"system:index": "32"
				}),
		ee.Feature(
				ee.Geometry.Point([91.4634469183959, 25.1069091163978]),
				{
					"class": 0,
					"system:index": "33"
				})]);
	var land = /* color: #98ff00 */ee.FeatureCollection(
		[ee.Feature(
				ee.Geometry.Point([90.50497372810287, 25.923182257149577]),
				{
					"class": 1,
					"system:index": "0"
				}),
		ee.Feature(
				ee.Geometry.Point([90.55990536872787, 25.98739056373601]),
				{
					"class": 1,
					"system:index": "1"
				}),
		ee.Feature(
				ee.Geometry.Point([90.58050473396224, 25.757561260062584]),
				{
					"class": 1,
					"system:index": "2"
				}),
		ee.Feature(
				ee.Geometry.Point([90.70135434333724, 25.80084283811404]),
				{
					"class": 1,
					"system:index": "3"
				}),
		ee.Feature(
				ee.Geometry.Point([90.38687070075912, 25.839164755855307]),
				{
					"class": 1,
					"system:index": "4"
				}),
		ee.Feature(
				ee.Geometry.Point([90.30035336677474, 25.896006666231017]),
				{
					"class": 1,
					"system:index": "5"
				}),
		ee.Feature(
				ee.Geometry.Point([90.22894223396224, 25.78476866684079]),
				{
					"class": 1,
					"system:index": "6"
				}),
		ee.Feature(
				ee.Geometry.Point([90.41158993904037, 25.772402437024404]),
				{
					"class": 1,
					"system:index": "7"
				}),
		ee.Feature(
				ee.Geometry.Point([90.27288754646224, 25.86264625056379]),
				{
					"class": 1,
					"system:index": "8"
				}),
		ee.Feature(
				ee.Geometry.Point([90.82681747116112, 25.789293104815815]),
				{
					"class": 1,
					"system:index": "9"
				}),
		ee.Feature(
				ee.Geometry.Point([90.74968875888567, 25.653605730590062]),
				{
					"class": 1,
					"system:index": "10"
				}),
		ee.Feature(
				ee.Geometry.Point([90.57253421787004, 25.680836922802552]),
				{
					"class": 1,
					"system:index": "11"
				}),
		ee.Feature(
				ee.Geometry.Point([90.67003787997942, 25.72290925269065]),
				{
					"class": 1,
					"system:index": "12"
				}),
		ee.Feature(
				ee.Geometry.Point([90.69338382724504, 25.63008287928111]),
				{
					"class": 1,
					"system:index": "13"
				}),
		ee.Feature(
				ee.Geometry.Point([90.42971195224504, 25.67093539073469]),
				{
					"class": 1,
					"system:index": "14"
				}),
		ee.Feature(
				ee.Geometry.Point([90.3665405655263, 25.62513010945234]),
				{
					"class": 1,
					"system:index": "15"
				}),
		ee.Feature(
				ee.Geometry.Point([90.5093628311513, 25.60655539380374]),
				{
					"class": 1,
					"system:index": "16"
				}),
		ee.Feature(
				ee.Geometry.Point([90.57715713399466, 25.521132280573585]),
				{
					"class": 1,
					"system:index": "17"
				}),
		ee.Feature(
				ee.Geometry.Point([90.43982803243216, 25.52237156829482]),
				{
					"class": 1,
					"system:index": "18"
				}),
		ee.Feature(
				ee.Geometry.Point([90.36704360860404, 25.383491894774213]),
				{
					"class": 1,
					"system:index": "19"
				}),
		ee.Feature(
				ee.Geometry.Point([90.12259780782279, 25.387213973132503]),
				{
					"class": 1,
					"system:index": "20"
				}),
		ee.Feature(
				ee.Geometry.Point([90.21186172383841, 25.321440373857357]),
				{
					"class": 1,
					"system:index": "21"
				}),
		ee.Feature(
				ee.Geometry.Point([90.07453262227591, 25.511217518121384]),
				{
					"class": 1,
					"system:index": "22"
				}),
		ee.Feature(
				ee.Geometry.Point([89.92896377461966, 25.382251176491692]),
				{
					"class": 1,
					"system:index": "23"
				}),
		ee.Feature(
				ee.Geometry.Point([90.75019180196341, 25.430629739193108]),
				{
					"class": 1,
					"system:index": "24"
				}),
		ee.Feature(
				ee.Geometry.Point([90.97953140157279, 25.496343839212084]),
				{
					"class": 1,
					"system:index": "25"
				}),
		ee.Feature(
				ee.Geometry.Point([90.96854507344779, 25.565738572466465]),
				{
					"class": 1,
					"system:index": "26"
				}),
		ee.Feature(
				ee.Geometry.Point([90.82160293477591, 25.56821621305931]),
				{
					"class": 1,
					"system:index": "27"
				}),
		ee.Feature(
				ee.Geometry.Point([91.20200454610404, 25.63509312145408]),
				{
					"class": 1,
					"system:index": "28"
				}),
		ee.Feature(
				ee.Geometry.Point([91.07428848165091, 25.67099305111786]),
				{
					"class": 1,
					"system:index": "29"
				}),
		ee.Feature(
				ee.Geometry.Point([91.16329164826948, 25.574241739262497]),
				{
					"class": 1,
					"system:index": "30"
				}),
		ee.Feature(
				ee.Geometry.Point([91.20362393013033, 25.823849192342443]),
				{
					"class": 1,
					"system:index": "31"
				}),
		ee.Feature(
				ee.Geometry.Point([91.03196255317721, 25.905407012760868]),
				{
					"class": 1,
					"system:index": "32"
				}),
		ee.Feature(
				ee.Geometry.Point([90.96604458442721, 25.799123596000392]),
				{
					"class": 1,
					"system:index": "33"
				}),
		ee.Feature(
				ee.Geometry.Point([91.20774380317721, 25.757078244132835]),
				{
					"class": 1,
					"system:index": "34"
				}),
		ee.Feature(
				ee.Geometry.Point([91.27528167430933, 25.69602943390407]),
				{
					"class": 1,
					"system:index": "35"
				}),
		ee.Feature(
				ee.Geometry.Point([91.07738651876048, 25.45121295149617]),
				{
					"class": 1,
					"system:index": "36"
				}),
		ee.Feature(
				ee.Geometry.Point([91.04717411641673, 25.343283338369833]),
				{
					"class": 1,
					"system:index": "37"
				}),
		ee.Feature(
				ee.Geometry.Point([90.91938797671605, 25.302984492054733]),
				{
					"class": 1,
					"system:index": "38"
				}),
		ee.Feature(
				ee.Geometry.Point([90.95395595159903, 25.450882684279033]),
				{
					"class": 1,
					"system:index": "39"
				}),
		ee.Feature(
				ee.Geometry.Point([89.74994328635205, 26.57388924118249]),
				{
					"class": 1,
					"system:index": "40"
				}),
		ee.Feature(
				ee.Geometry.Point([89.9614301027583, 26.27627681490045]),
				{
					"class": 1,
					"system:index": "41"
				}),
		ee.Feature(
				ee.Geometry.Point([90.00812199728955, 26.347675361965678]),
				{
					"class": 1,
					"system:index": "42"
				}),
		ee.Feature(
				ee.Geometry.Point([90.1207318605708, 26.63037314867019]),
				{
					"class": 1,
					"system:index": "43"
				}),
		ee.Feature(
				ee.Geometry.Point([90.2800336183833, 26.640193589315253]),
				{
					"class": 1,
					"system:index": "44"
				}),
		ee.Feature(
				ee.Geometry.Point([90.06305363791455, 26.20729857895413]),
				{
					"class": 1,
					"system:index": "45"
				}),
		ee.Feature(
				ee.Geometry.Point([89.93671086447705, 26.194976730803155]),
				{
					"class": 1,
					"system:index": "46"
				}),
		ee.Feature(
				ee.Geometry.Point([89.5988812746333, 26.125950299915512]),
				{
					"class": 1,
					"system:index": "47"
				}),
		ee.Feature(
				ee.Geometry.Point([89.3901410402583, 26.182653578891596]),
				{
					"class": 1,
					"system:index": "48"
				}),
		ee.Feature(
				ee.Geometry.Point([89.4725385011958, 26.236865692589486]),
				{
					"class": 1,
					"system:index": "49"
				}),
		ee.Feature(
				ee.Geometry.Point([89.5494427980708, 26.032206311787235]),
				{
					"class": 1,
					"system:index": "50"
				}),
		ee.Feature(
				ee.Geometry.Point([89.2967572511958, 25.95567541455496]),
				{
					"class": 1,
					"system:index": "51"
				}),
		ee.Feature(
				ee.Geometry.Point([89.28302434103955, 26.04948058030888]),
				{
					"class": 1,
					"system:index": "52"
				}),
		ee.Feature(
				ee.Geometry.Point([89.47528508322705, 25.8593238964065]),
				{
					"class": 1,
					"system:index": "53"
				})]);
	
	// Dataset containing ground truth values for water and land areas
	var dataset = water.merge(land)

	// Specifying bands used for classification
	var bands = ['VV'];
	image = image.select(bands)

	// Training dataset
	var training = image.sampleRegions({
		collection: dataset,
		properties: ['class'],
		scale: 30
	})

	// SVM Classifier
	var classifier = ee.Classifier.svm({
		kernelType: 'RBF',
		gamma: 0.5,
		cost: 10
	})

	// Training the classifier
	var trained = classifier.train(training, 'class', bands);

	// Performing classification using trained classifier
	var classified = image.classify(trained);

	// Morphological Smoothening
	classified = classified.focal_median(500, 'circle', 'meters');
	var first = classified;

	var imageURL = first.getThumbURL(imageVisParam);

	// Date: 26/07/18
	var validationImage = sentinel1.filterBounds(point).filterDate('2018-07-26', '2018-07-31');
	validationImage = validationImage.first();

	var second = validationImage.classify(trained);
	second = second.focal_median(500, 'circle', 'meters');

	var imageURL2 = second.getThumbURL(imageVisParam);

	// Difference image for change detection
	var diffimage = ee.Image().expression(
		'(2 * B1 + B2)', {
			'B1': first.select('classification'),
			'B2': second.select('classification')
		});
	
	var imageURL3 = diffimage.getThumbURL({
		min: 0,
		max: 3,
		palette: ['white', 'brown', 'blue', 'white']
	});

	res.render('index.ejs', {
		url: imageURL,
		url2: imageURL2,
		url3: imageURL3
	});
})