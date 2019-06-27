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

module.exports.getImageVisParams = (type) => {
	var imageVisParam;
	if (type == 'classified') {
		imageVisParam = {
			bands: ['classification'], 
			min: 0,
			max: 1, 
			palette: ['68dae6', 'a5611b']
		};
	} else if (type == 'sar') {
		imageVisParam = {
			min: -25,
			max: 0
		};
	} else {
		imageVisParam = {
			min: 1, 
			max: 4, 
			palette: ['white', 'brown', 'blue', 'white']
		}
	}
	return imageVisParam;
}

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
