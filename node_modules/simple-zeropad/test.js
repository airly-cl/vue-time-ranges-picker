'use strict';

var assert = require('assert');
var zp = require('./');


describe('zeropad', function(){

    it('should zeropad any digit below 10', function(done){

        assert.equal(zp(10), '10');
        assert.equal(zp(9),  '09');
        assert.equal(zp(0),  '00');
        done();

    });

    it('should allow digits to be strings', function(done){

        assert.equal(zp('10'), '10');
        assert.equal(zp('9'),  '09');
        assert.equal(zp('0'),  '00');
        done();

    });

    it('should error when parameter is NaN ', function(){

        assert.throws(function(){
            zp({});
        });
    });


});