# aws-iot-mqtt-broker

## Usage:

### Connecting
```
const broker = require('@mhlabs/aws-iot-mqtt-broker')
const ws = IoT('https://endpoint-returning-temporary-AWS-access-keys.com');
```

### Subscribe to topic:
```
ws.subscribe('your/topic');
```

### Send message
```
ws.send('your/topic', message);
```

### Handle message:
```
ws.onMessage = (topic, message) => {console.log("Topic: " + topic + " received " + message)}
```
