'use strict';

const awsIot = require('aws-iot-device-sdk');

module.exports = function (iotEndpoint) {
    var client;
    var iotTopics = [];
    var WS = {
        connect: function() {
                    client = awsIot.device({
                        region: AWS.config.region,
                        protocol: 'wss',
                        accessKeyId: AWS.credentials.AccessKeyId,
                        secretKey: AWS.credentials.SecretKey,
                        sessionToken: AWS.credentials.SessionToken,
                        port: 443,
                        host: iotEndpoint
                    });

                    client.on('connect', WS.onConnect);
                    client.on('message', (x,y) => this.onMessage(x,y));
                    client.on('error', WS.onError);
                    client.on('reconnect', WS.onReconnect);
                    client.on('offline', WS.onOffline);
                    client.on('close', WS.onClose);
            },

        send: function(topic, message) {
            client.publish(topic, message);
        },

        subscribe: function(topic) {
            if (client) {
                client.subscribe(topic);
                console.log("subscribed to " + topic);
            } else {
                iotTopics.push(topic);
                console.log("deferring subscription of " + topic);
            }
        },

        onConnect: function() {
            for (var i = 0; i < iotTopics.length; i++) {
                console.log("trying to connect to " + iotTopics[i]);
                WS.subscribe(iotTopics[i]);
            }
            iotTopics = [];
        },

        onMessage: function(topic, message) {
            console.log(topic + " received: " + message);
        },

        onClose: function() {
            console.log('Connection failed');
        },

        onError: function() { console.log('Error'); },
        onReconnect: function() { console.log('Reconnected'); },
        onOffline: function() { console.log('Offline'); }
    };

    WS.connect(iotEndpoint);
    return WS;

}
