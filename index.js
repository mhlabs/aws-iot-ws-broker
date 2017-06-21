'use strict';

const awsIot = require('aws-iot-device-sdk');

module.exports = function (keysUrl) {
    if (keysUrl === "") {
        throw new Error("Url missing");
    }
    var client;
    var iotTopics = [];
    var WS = {
        connect: function(keysUrl) {
            var xhr = createCORSRequest('GET', keysUrl);

            xhr.send(null);

            xhr.onreadystatechange = function () {
                var DONE = 4;
                var OK = 200;
                if (xhr.readyState === DONE) {
                    if (xhr.status === OK)
                        var body = JSON.parse(xhr.responseText);
                    console.log(body);
                    console.log(body.region);

                    client = awsIot.device({
                        region: body.region,
                        protocol: 'wss',
                        accessKeyId: body.accessKey,
                        secretKey: body.secretKey,
                        sessionToken: body.sessionToken,
                        port: 443,
                        host: body.iotEndpoint
                    });

                    client.on('connect', WS.onConnect);
                    client.on('message', WS.onMessage);
                    client.on('error', WS.onError);
                    client.on('reconnect', WS.onReconnect);
                    client.on('offline', WS.onOffline);
                    client.on('close', WS.onClose);
                }
                else {
                    console.log('Error: ' + xhr.status);
                }
            }
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
                console.log("trying to connect to " + iotTopics[i])
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

    WS.connect(keysUrl);
    return WS;


}


function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

