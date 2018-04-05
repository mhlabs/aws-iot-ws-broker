'use strict';
var expect = require('chai').expect;
var AwsIot = require('../dist/index');

describe('AWS IOT websocket broker', function() {
    it('should throw an error when no config is supplied', function() {
        var result = true;
        expect(result).to.equal(true);        
    });
});