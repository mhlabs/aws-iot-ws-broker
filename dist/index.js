"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var aws_iot_device_sdk_1 = require("aws-iot-device-sdk");
var Subject_1 = require("rxjs/Subject");
require("rxjs/add/operator/filter");
require("rxjs/add/operator/map");
var AWS = require("aws-sdk");
var AwsIot = /** @class */ (function () {
    function AwsIot(region, identityPoolId, debugMode) {
        if (debugMode === void 0) { debugMode = false; }
        this.region = region;
        this.identityPoolId = identityPoolId;
        this.debugMode = debugMode;
        this.events = new Subject_1.Subject();
        this.topics = new Array();
        if (!this.region) {
            throw new Error('No region value provided.');
        }
        if (!this.identityPoolId) {
            throw new Error('No region value provided.');
        }
        this.connect();
    }
    AwsIot.prototype.connect = function () {
        var _this = this;
        // Make the call to obtain credentials
        AWS.config.region = this.region;
        var creds = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: this.identityPoolId
        });
        AWS.config.credentials = creds;
        creds.get(function (credsErr) {
            if (credsErr) {
                _this.log('Error!', credsErr);
                return;
            }
            _this.log('Got credentials');
            var iot = new AWS.Iot();
            iot.describeEndpoint({}, function (err, data) {
                if (err) {
                    _this.log('Error getting endpoint address', err);
                    return;
                }
                var config = {
                    region: AWS.config.region,
                    protocol: 'wss',
                    accessKeyId: creds.accessKeyId,
                    secretKey: creds.secretAccessKey,
                    sessionToken: creds.sessionToken,
                    port: 443,
                    debug: _this.debugMode,
                    host: data.endpointAddress
                };
                _this.log('Connecting with config:', config);
                try {
                    _this.client = new aws_iot_device_sdk_1.device(config);
                }
                catch (deviceErr) {
                    _this.log('Error creating device:', deviceErr);
                    return;
                }
                _this.client.on('connect', function () { return _this.onConnect(); });
                _this.client.on('message', function (topic, message) { return _this.onMessage(topic, message); });
                _this.client.on('error', function () { return _this.onError(); });
                _this.client.on('reconnect', function () { return _this.onReconnect(); });
                _this.client.on('offline', function () { return _this.onOffline(); });
                _this.client.on('close', function () { return _this.onClose(); });
            });
        });
    };
    AwsIot.prototype.send = function (topic, message) {
        this.client.publish(topic, message);
    };
    AwsIot.prototype.subscribe = function (topic) {
        if (this.client) {
            this.client.subscribe(topic);
            this.log('Subscribed to topic:', topic);
        }
        else {
            this.topics.push(topic);
            this.log('Deferring subscription of topic:', topic);
        }
    };
    AwsIot.prototype.unsubscribe = function (topic) {
        if (this.client) {
            this.client.unsubscribe(topic);
            this.log('Unubscribed from topic:', topic);
        }
    };
    AwsIot.prototype.onConnect = function () {
        this.log('Connected');
        this.events.next({ type: IotEvent.Connect });
        for (var _i = 0, _a = this.topics; _i < _a.length; _i++) {
            var topic = _a[_i];
            this.log('Trying to connect to topic:', topic);
            this.subscribe(topic);
        }
        this.topics = new Array();
    };
    AwsIot.prototype.onMessage = function (topic, message) {
        this.log("Message received from topic: " + topic, JSON.parse(message));
        this.events.next({
            type: IotEvent.Message,
            topic: topic,
            message: message
        });
    };
    AwsIot.prototype.onClose = function () {
        this.log('Connection failed');
        this.events.next({ type: IotEvent.Close });
    };
    AwsIot.prototype.onError = function () {
        this.log('Error');
        this.events.next({ type: IotEvent.Error });
    };
    AwsIot.prototype.onReconnect = function () {
        this.log('Reconnected');
        this.events.next({ type: IotEvent.Reconnect });
    };
    AwsIot.prototype.onOffline = function () {
        this.log('Offline');
        this.events.next({ type: IotEvent.Offline });
    };
    AwsIot.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (console && this.debugMode) {
            console.log.apply(console, args);
        }
    };
    return AwsIot;
}());
exports.default = AwsIot;
var IotEvent;
(function (IotEvent) {
    IotEvent["Connect"] = "connect";
    IotEvent["Message"] = "message";
    IotEvent["Close"] = "close";
    IotEvent["Error"] = "error";
    IotEvent["Reconnect"] = "reconnect";
    IotEvent["Offline"] = "offline";
})(IotEvent = exports.IotEvent || (exports.IotEvent = {}));
