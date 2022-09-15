'use strict';
var zp = require('simple-zeropad');
var trim = require('trim');

module.exports = function (str, opts) {
	if (typeof str !== 'string') {
		throw new TypeError('twelve-to-twentyfour expected a string, got ' + typeof(str));
	}

	// remove whitespace
	str = trim(str);

	// Check for pattern 0:00
	if (str.length === 4 && str.substring(1, 2) === ':') {
		str = '0' + str;
	}

	// Allow strings already in the 24-hour format to pass through
	var reg24 = /^[0-9]{2}:[0-9]{2}(:[0-9]{2})?$/;

	if (reg24.test(str)) {
		var _error = false;

		var parts = str.split(':').map(function (i) {
			return parseInt(i, 10);
		});

		if (parts.length === 2) {
			if (parts[0] < 24 && parts[1] < 60) {
				return str;
			} else {
				_error = true;
			}
		} else if (parts.length === 3) {
			if (parts[0] < 24 && parts[1] < 60 && parts[2] < 60) {
				return str;
			} else {
				_error = true;
			}
		}

		if (_error) {
			throw new SyntaxError('Invalid 24-hour time string format: ' + str + ' Use 00:00 || 00:00:00');
		}
	}
	// valid strings: '0:00AM' || '0:00 AM' || '00:00PM' || '00:00 PM' || '00:00:00 AM' || '00:00:00AM'
	var reg12 = /^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?\s?(AM|PM)$/i;
	if (!reg12.test(str)) {
		throw new SyntaxError('Invalid time string format: ' + str + ' Use 0:00AM || 0:00 AM || 00:00PM || 00:00 PM || 00:00:00 AM || 00:00:00AM');
	}

	// there should be an AM or PM at this point
	var ampm = str.slice(str.length - 2).toUpperCase();
	if (!(ampm === 'AM' || ampm === 'PM')) {
		throw new SyntaxError('12-hour time string must have an `AM` or `PM`.');
	}

	opts = opts || {};

	var time = str.substring(0, str.length - 2).split(':');
	var hour = parseInt(time[0], 10);
	var mins = parseInt(time[1], 10);
	var secs = time.length === 3 ? parseInt(time[2], 10) : null;

	if (isNaN(hour) || isNaN(mins)) {
		throw new SyntaxError('Hour and minutes must be numbers: `00:00`');
	}
	if (hour > 12) {
		throw new SyntaxError('Hours must be less than 13 in 12-hour time');
	}
	if (mins > 59) {
		throw new SyntaxError('Minutes must be less than 59');
	}
	if (secs && secs > 59) {
		throw new SyntaxError('Seconds must be less than 59');
	}
	if (ampm === 'AM') {
		if (hour < 12) {
			return makeTimeString(hour, mins, secs);
		} else if (hour === 12) {
			return makeTimeString(0, mins, secs);
		}
	} else if (ampm === 'PM') {
		var newHour = hour === 12 ? 12 : hour + 12;
		return makeTimeString(newHour, mins, secs);
	}
};

function makeTimeString(hour, mins, secs) {
	var s = '';
	if (secs) {
		s = ':' + zp(secs);
	}
	return zp(hour) + ':' + zp(mins) + s;
}
