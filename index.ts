import { device, DeviceOptions } from 'aws-iot-device-sdk';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import AWS = require('aws-sdk');

export default class AwsIot {
  events = new Subject<{
    type: IotEvent;
    [key: string]: any;
  }>();

  private client: any;
  private topics = new Array<string>();

  constructor(private creds: AWS.CognitoIdentityCredentials, private debugMode = false) {
    if (!creds) {
      throw new Error('No config provided.');
    }
    this.connect();
  }

  connect() {

    const iot = new AWS.Iot();

    iot.describeEndpoint({}, (err, data) => {

      if (err) {
        this.log('Error getting endpoint address', err);
        return;
      }

      const config: DeviceOptions = {
        region: AWS.config.region,
        protocol: 'wss',
        accessKeyId: this.creds.accessKeyId,
        secretKey: this.creds.secretAccessKey,
        sessionToken: this.creds.sessionToken,
        port: 443,
        debug: this.debugMode,
        host: data.endpointAddress
      };

      try {
        this.client = new device(config);
      } catch (deviceErr) {
        this.log('Error creating device:', deviceErr);
        return;
      }

      this.client.on('connect', () => this.onConnect());
      this.client.on('message', (topic: string, message: any) => this.onMessage(topic, message));
      this.client.on('error', () => this.onError());
      this.client.on('reconnect', () => this.onReconnect());
      this.client.on('offline', () => this.onOffline());
      this.client.on('close', () => this.onClose());
    });
  }

  send(topic: string, message: any) {
    this.client.publish(topic, message);
  }

  subscribe(topic: string) {
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

  private onMessage(topic: string, message: any) {
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

  private log(...args: any[]) {
    if (console && this.debugMode) {
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
