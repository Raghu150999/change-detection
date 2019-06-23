let promises = [];

for (var i = 0; i < 10; i++) {
	var promise = (function(i) {
		return new Promise(function(resolve, reject) {
			setTimeout(function() {
				console.log(i);
				resolve(i);
			}, 200 + i * 100)
		})
	})(i)
	promises.push(promise);
}

Promise.all(promises).then(function () {
	arguments[0].forEach(i => {
		console.log('value', i);
	})
})
