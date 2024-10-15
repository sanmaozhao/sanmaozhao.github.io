navigator.geolocation.getCurrentPosition = function (a, b) {
  setTimeout(function () {
    a({
      coords: {
        latitude: 40.0203737 + (Math.random() - 0.5) * 0.001,
        longitude: 116.465384 + (Math.random() - 0.5) * 0.001,
      },
      timestamp: Date.now(),
    });
  }, 100);
};
