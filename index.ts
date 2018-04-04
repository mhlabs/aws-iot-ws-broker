import { AWS, awsIot } from "aws-iot-device-sdk";
import { Subject } from "rxjs/Subject";

export default class {
  messages = new Subject<{
    topic: string;
    message: any;
  }>();

  events = new Subject<{
    event: string;
    [key: string]: any;
  }>();

  private client;
  private topics = new Array<string>();

  constructor(iotEndpoint: string, private debugMode = false) {
    this.connect(iotEndpoint);
  }

  connect(iotEndpoint: string) {
    this.client = awsIot.device({
      region: AWS.config.region,
      protocol: "wss",
      accessKeyId: AWS.credentials.AccessKeyId,
      secretKey: AWS.credentials.SecretKey,
      sessionToken: AWS.credentials.SessionToken,
      port: 443,
      host: iotEndpoint
    });

    this.client.on("connect", this.onConnect);
    this.client.on("message", (topic, message) =>
      this.onMessage(topic, message)
    );
    this.client.on("error", this.onError);
    this.client.on("reconnect", this.onReconnect);
    this.client.on("offline", this.onOffline);
    this.client.on("close", this.onClose);
  }

  send(topic, message) {
    this.client.publish(topic, message);
  }

  subscribe(topic) {
    if (this.client) {
      this.client.subscribe(topic);
      this.log("Subscribed to topic:", topic);
    } else {
      this.topics.push(topic);
      this.log("Deferring subscription of topic:", topic);
    }
  }

  private onConnect() {
    this.log("Connected");
    this.events.next({event: 'connect'});
    for (let topic of this.topics) {
      this.log("Trying to connect to topic:", topic);
      this.subscribe(topic);
    }

    this.topics = new Array<string>();
  }

  private onMessage(topic, message) {
    this.log(`Message received from topic: ${topic}`, message);
    this.messages.next({
      topic: topic,
      message: message
    });
  }

  private onClose() {
    this.log("Connection failed");
    this.events.next({event: 'close'});
  }

  private onError() {
    this.log("Error");
    this.events.next({event: 'error'});
  }

  private onReconnect() {
    this.log("Reconnected");
    this.events.next({event: 'reconnect'});
  }

  private onOffline() {
    this.log("Offline");
    this.events.next({event: 'offline'});
  }

  private log(...args) {
    if (console && this.debugMode) {
      console.log(args);
    }
  }
}
