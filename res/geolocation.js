navigator.geolocation.getCurrentPosition = function(a, b) {
	a({
		coords: {
			latitude: 40.041791 + (Math.random()-0.5)*0.001,
			longitude: 116.3520515 + (Math.random()-0.5)*0.001
		},
		timestamp: Date.now()
	})
}