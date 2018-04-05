import { device, DeviceOptions } from 'aws-iot-device-sdk';
import { Subject } from 'rxjs/Subject';

export default class AwsIot {
  events = new Subject<{
    type: IotEvent;
    [key: string]: any;
  }>();

  private client;
  private topics = new Array<string>();

  constructor(private config: DeviceOptions) {
    if (!this.config) {
      throw new Error('Config is required');
    }
    this.connect();
  }

  connect() {
    this.log('Connecting to', this.config.host);

    const options: DeviceOptions = Object.assign(
      {
        protocol: 'wss',
        port: 443
      },
      this.config
    );

    this.client = new device(options);

    this.client.on('connect', () => this.onConnect());
    this.client.on('message', (topic, message) => this.onMessage(topic, message));
    this.client.on('error', () => this.onError());
    this.client.on('reconnect', () => this.onReconnect());
    this.client.on('offline', () => this.onOffline());
    this.client.on('close', () => this.onClose());
  }

  send(topic, message) {
    this.client.publish(topic, message);
  }

  subscribe(topic) {
    if (this.client) {
      this.client.subscribe(topic);
      this.log('Subscribed to topic:', topic);
    } else {
      this.topics.push(topic);
      this.log('Deferring subscription of topic:', topic);
    }
  }

  unsubscribe(topic: string) {
    if (this.client) {
      this.client.unsubscribe(topic);
      this.log('Unubscribed from topic:', topic);
    }
  }

  private onConnect() {
    this.log('Connected');
    this.events.next({ type: IotEvent.Connect });
    for (const topic of this.topics) {
      this.log('Trying to connect to topic:', topic);
      this.subscribe(topic);
    }

    this.topics = new Array<string>();
  }

  private onMessage(topic, message) {
    this.log(`Message received from topic: ${topic}`, JSON.parse(message));
    this.events.next({
      type: IotEvent.Message,
      topic: topic,
      message: message
    });
  }

  private onClose() {
    this.log('Connection failed');
    this.events.next({ type: IotEvent.Close });
  }

  private onError() {
    this.log('Error');
    this.events.next({ type: IotEvent.Error });
  }

  private onReconnect() {
    this.log('Reconnected');
    this.events.next({ type: IotEvent.Reconnect });
  }

  private onOffline() {
    this.log('Offline');
    this.events.next({ type: IotEvent.Offline });
  }

  private log(...args) {
    if (console && this.config.debug) {
      console.log(...args);
    }
  }
}

export { DeviceOptions } from 'aws-iot-device-sdk';

export enum IotEvent {
  Connect = 'connect',
  Message = 'message',
  Close = 'close',
  Error = 'error',
  Reconnect = 'reconnect',
  Offline = 'offline'
}
