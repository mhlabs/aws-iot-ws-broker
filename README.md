# aws-iot-mqtt-broker

## Usage:

### Installation
```
npm i -s @mhlabs/aws-iot-ws-broker
```

### Connecting (TypeScript)
```
import AwsIot, { IotEvent } from '@mhlabs/aws-iot-ws-broker';

// credentials could be e.g. from Cognito Identity Pool
const creds: CognitoIdentityCredentials = createCredentials();
this.websocket = new AwsIot(creds, !environment.production);
```

### Subscribe to topic:
```
this.websocket.subscribe('your/topic');
```

### Send message
```
this.websocket.send('your/topic', message);
```

### Handle message:
```
this.websocket.onMessage = (topic, message) => {console.log("Topic: " + topic + " received " + message)}
```
