const ee = require('@google/earthengine');
const nodemailer = require("nodemailer");
const Receiver = require('./../models/receiver');

var getSentinel = () => {
	var sentinel = ee.ImageCollection('COPERNICUS/S1_GRD');
	sentinel = sentinel.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
										 .filter(ee.Filter.eq('instrumentMode', 'IW')).select('VV');
	return sentinel;
}

module.exports.getSentinel = getSentinel;

module.exports.getClassifier = () => {
	var sentinel = getSentinel();
	var point = ee.Geometry.Point([89.85, 25.81]);
	var roi = sentinel.filterBounds(point)
										.filter(ee.Filter.eq('relativeOrbitNumber_start', 150))
										.filter(ee.Filter.eq('relativeOrbitNumber_stop', 150))
										.filterDate('2018-07-14', '2018-07-15');
	roi = roi.first();
	var dataset = ee.FeatureCollection('users/raghu15sep99/land_water_dataset');

	// Specifying bands used for classification
	var bands = ['VV'];
	roi = roi.select(bands);

	// Training dataset
	var training = roi.sampleRegions({
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
	return trained;
}

var getImageVisParams = (type) => {
	var imageVisParam;
	if (type == 'classified') {
		imageVisParam = {
			bands: ['classification'], 
			min: 0,
			max: 1, 
			palette: ['68dae6', '8f8a82']
		};
	} else if (type == 'sar') {
		imageVisParam = {
			min: -25,
			max: 0
		};
	} else if(type == 'change map') {
		imageVisParam = {
			min: 1, 
			max: 4, 
			palette: ['white', 'brown', 'blue', 'white']
		} 
	} else if(type == 'optical') {
		imageVisParam = {
			min: 0,
			max: 3000,
			bands: ['B4', 'B3', 'B2'],
			format: 'png',

		}
	} else if(type == 'ndwi') {
		imageVisParam = {
			min: 0,
			max: 0.3,
			palette: ['8f8a82', '68dae6']
		}
	} else if(type == 'nd') {
		imageVisParam = {
			min: 0,
			max: 10,
			palette: ['62eb4a', 'cyan', 'blue']
		}
	}
	return imageVisParam;
}

module.exports.getImageVisParams = getImageVisParams;

module.exports.getImages = (sceneMeta, sd, ed) => {
	var sentinel = getSentinel();
	var point = ee.Geometry.Point(sceneMeta.coordinates);
	sentinel = sentinel.filterDate(sd, ed).filterBounds(point)
											.filter(ee.Filter.eq('relativeOrbitNumber_start', sceneMeta.rons[0]))
											.filter(ee.Filter.eq('relativeOrbitNumber_stop', sceneMeta.rons[1]));
	return sentinel;
}

module.exports.getPreFlood = (sceneMeta) => {
	var sentinel = getSentinel();
	var point = ee.Geometry.Point(sceneMeta.coordinates);
	sentinel = sentinel.filterBounds(point)
		.filter(ee.Filter.eq('relativeOrbitNumber_start', sceneMeta.rons[0]))
		.filter(ee.Filter.eq('relativeOrbitNumber_stop', sceneMeta.rons[1]));
	var pfc = sentinel;
	var pfc_2016 = pfc.filterDate('2016-01-01', '2016-06-01');
	var pfc_2017 = pfc.filterDate('2017-01-01', '2017-06-01');
	var pfc_2018 = pfc.filterDate('2018-01-01', '2018-06-01');
	var pfc_2019 = pfc.filterDate('2019-01-01', '2019-06-01');
	pfc = pfc_2018.merge(pfc_2017)
								.merge(pfc_2016)
								.merge(pfc_2019);
	var mean = pfc.mean();
	return mean;
}

module.exports.sendMail = (subject, text) => {
	var string = '';
	Receiver.find({})
		.then(receivers => {
			var len = receivers.length;
			for (var i = 0; i < len; i++) {
				string += receivers[i].receiverEmail;
				if (i != len - 1)
					string += ', ';
			}
			if (len > 0) {
				// async..await is not allowed in global scope, must use a wrapper
				async function main(){
					// create reusable transporter object using the default SMTP transport
					let transporter = nodemailer.createTransport({
						host: 'smtp.gmail.com',
						port: 465,
						secure: true, // use SSL
						auth: {
							user: 'blakestark150999@gmail.com',
							pass: 'blakestarkingmail'
						}
					});
					
					// send mail with defined transport object
					let info = await transporter.sendMail({
						from: '"Change Detection Alert" <blakestark150999@gmail.com>', // sender address
						to: string, // list of receivers
						subject: subject, // Subject line
						text: text // plain text body
					});
					
					console.log("Message sent: %s", info.messageId);
					// Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
				}
				main().catch(console.error);
			}
		})
}

module.exports.getkmlURL = (image) => {
	return new Promise((resolve, reject) => {
		let geometry = image.geometry();
		image = image.expression('b("classification") == 0 ? 100 : 0');
		image = image.updateMask(image.gt(0))
		image = image.clip(geometry)
		var vectors = image.reduceToVectors({
			scale: 1000
		});
		var kml_url = vectors.getDownloadURL({
			format: 'kml',
			filename: 'river_layer'
		});
		resolve(kml_url);
	})
}

module.exports.getkmlURLs2 = (image) => {
	return new Promise((resolve, reject) => {
		let geometry = image.geometry();
		var ndwi = image.normalizedDifference(['B3', 'B11']);
		var classified = ndwi.expression('b("nd") >= 0.09 ? 100 : 0');
		classified = classified.expression('B1 == 0 ? B2 : 0', {
			'B1': image.select('QA60'),
			'B2': classified.select('constant')
		})
		classified = classified.updateMask(classified.gt(0))
		classified = classified.clip(geometry);
		var vectors = classified.reduceToVectors({
			scale: 1000
		});
		var kml_url = vectors.getDownloadURL({
			format: 'kml',
			filename: 'river_layer_s2'
		});
		resolve(kml_url);
	})
}

module.exports.getOpticalURL = (image) => {
	return new Promise((resolve, reject) => {
		image.getThumbURL(getImageVisParams('optical'), url => {
			resolve(url);
		})
	})
}

module.exports.getClassifiedURL = (classified_image) => {
	return new Promise((resolve, reject) => {
		classified_image.getThumbURL(getImageVisParams('nd'), url => {
			resolve(url);
		});
	})
}

module.exports.getClassified = (image, sceneID) => {
	var len = sceneID.length;
	var titleID = '';
	for(var i = len - 6; i < len; i++) {
		titleID += sceneID[i];
	}
	var pre = ee.Image("users/raghu15sep99/" + titleID);
	var mndwi = image.normalizedDifference(['B3', 'B11']);
	var classified = mndwi.gt(0.09); // Change threshold accordingly
	var cloudmask = image.select('QA60').eq(0);
	classified = classified.and(cloudmask);
	classified = classified.select('nd').multiply(pre.select('constant'));
	return classified;
}