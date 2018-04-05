"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var aws_iot_device_sdk_1 = require("aws-iot-device-sdk");
var Subject_1 = require("rxjs/Subject");
var AwsIot = /** @class */ (function () {
    function AwsIot(config) {
        this.config = config;
        this.events = new Subject_1.Subject();
        this.topics = new Array();
        if (!this.config) {
            throw new Error('Config is required');
        }
        this.connect();
    }
    AwsIot.prototype.connect = function () {
        var _this = this;
        this.log('Connecting to', this.config.host);
        var options = Object.assign({
            protocol: 'wss',
            port: 443
        }, this.config);
        this.client = new aws_iot_device_sdk_1.device(options);
        this.client.on('connect', function () { return _this.onConnect(); });
        this.client.on('message', function (topic, message) { return _this.onMessage(topic, message); });
        this.client.on('error', function () { return _this.onError(); });
        this.client.on('reconnect', function () { return _this.onReconnect(); });
        this.client.on('offline', function () { return _this.onOffline(); });
        this.client.on('close', function () { return _this.onClose(); });
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
        if (console && this.config.debug) {
            console.log.apply(console, args);
        }
    };
    return AwsIot;
}());
exports.default = AwsIot;
var aws_iot_device_sdk_2 = require("aws-iot-device-sdk");
exports.DeviceOptions = aws_iot_device_sdk_2.DeviceOptions;
var IotEvent;
(function (IotEvent) {
    IotEvent["Connect"] = "connect";
    IotEvent["Message"] = "message";
    IotEvent["Close"] = "close";
    IotEvent["Error"] = "error";
    IotEvent["Reconnect"] = "reconnect";
    IotEvent["Offline"] = "offline";
})(IotEvent = exports.IotEvent || (exports.IotEvent = {}));
