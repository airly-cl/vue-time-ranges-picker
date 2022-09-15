'use strict';
var zp = require('simple-zeropad');
var trim = require('trim');
var validComps = [23, 59, 59];

module.exports = function (str) {
	if (typeof str !== 'string') {
		throw new TypeError('Expected a string');
	}
	str = trim(str);

	var reg24 = /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/;

	if (!reg24.test(str)) {
		throw new Error('String must be a 24-hour time');
	}
	var comps = str.split(':');

	var hour = parseInt(comps[0], 10);
	var ampm = (hour < 12 || hour === 0) ? 'AM' : 'PM';

	if (hour === 0) {
		comps[0] = 12;
	} else if (hour > 12) {
		comps[0] = hour - 12;
	}

	var s = '';

	comps.map(function (item, i) {
		var num = parseInt(item, 10);

		if (num > validComps[i]) {
			throw new Error('Invalid time: ' + str);
		}
		s += zp(num);

		if (i !== comps.length - 1) {
			s += ':';
		}
	});

	s += ' ' + ampm;
	return s;
};
