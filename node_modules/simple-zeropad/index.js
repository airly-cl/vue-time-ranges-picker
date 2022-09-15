'use strict';

module.exports = function (num) {
    num = parseFloat(num, 10);

    if (isNaN(num)) {
        throw new TypeError('zeropad parameter must be a string or a number');
    }
    if (num < 10) {
        return '0' + num;
    }
    return num;
};
