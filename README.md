# aws-iot-mqtt-broker

## Usage:

### Installation
```
npm i @mhlabs/aws-iot-ws-broker
```

### Connecting (TypeScript)
```javascript
import AwsIot, { IotEvent } from '@mhlabs/aws-iot-ws-broker';

// credentials could be e.g. from Cognito Identity Pool
const creds: CognitoIdentityCredentials = createCredentials();
this.websocket = new AwsIot(creds, !environment.production);
```

### Subscribe to topic:
New in this version is that `subscribe()` returns an Observable and therefor needs to be subscribed to. The Observable with emit and complete when the topic has been subscribed to.
```javascript
this.websocket.subscribe('your/topic').subscribe(topic => console.log(`${topic} has been subscribed to`));
```

### Send message
```javascript
this.websocket.send('your/topic', message);
```

### Handle message:
```javascript
this.websocket.events.pipe(filter(event => event.type === IotEventType.Message)).subscribe(event => console.log(`Message on topic ${event.topic}:`, event.message));
```
