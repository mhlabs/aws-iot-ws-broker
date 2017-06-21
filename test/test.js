'use strict';

var expect = require('chai').expect;
var IoT = require('../index');

describe('#IoTTest', function() {
    it('Keys url is required', function() {
        var result = function() {IoT("");}
        expect(result).to.throw(Error("jkj"));        
    });
});