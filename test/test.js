'use strict';
import { expect } from "chai";
import AwsIot from "../dist/index";
import 'babel-polyfill';


describe('AWS IOT websocket broker', () => {
    let awsIot;

    beforeEach(() => {
        awsIot = new AwsIot();
    });

    it('should throw an error when connecting without a config', () => {
        expect(awsIot.connect.bind(awsIot)).to.throw(Error, 'No AWS Cognito credentials provided');
    });

    it('should que up subscriptions before the client is ready', () => {
        const topicName = 'some-topic';
        awsIot.subscribe(topicName);
        expect(awsIot.topics).to.include(topicName);
    });
});