import { device, DeviceOptions } from "aws-iot-device-sdk";
import { Subject } from "rxjs/Subject";
import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import AWS = require("aws-sdk");
import { Observable } from "rxjs/Observable";
import { Observer } from "rxjs/Observer";

export default class AwsIot {
  public readonly events = new Subject<IotEvent>();

  private client!: device;
  private topics = new Array<string>();

  constructor(private debugMode = false) {}

  public connect(creds: AWS.CognitoIdentityCredentials, policyName: string) {
    if (!creds) {
      throw new Error("No AWS Cognito credentials provided");
    }

    const iot = new AWS.Iot();

    if (!policyName) {
      this.createDevice(iot, creds);
      return;
    }

    const principal = creds.identityId;

    iot.attachPrincipalPolicy({ principal, policyName }, policyErr => {
      if (policyErr) {
        this.log("Error attaching policy", policyErr);
        return;
      }

      this.createDevice(iot, creds);
    });
  }

  private createDevice(iot: AWS.Iot, creds: AWS.CognitoIdentityCredentials) {
    iot.describeEndpoint({}, (err, data) => {
      if (err) {
        this.log("Error getting endpoint address", err);
        return;
      }

      const config: DeviceOptions = {
        region: AWS.config.region,
        protocol: "wss",
        accessKeyId: creds.accessKeyId,
        secretKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        port: 443,
        debug: this.debugMode,
        host: data.endpointAddress,
        baseReconnectTimeMs: 500,
        maximumReconnectTimeMs: 2000
      };

      try {
        this.client = new device(config);
      } catch (deviceErr) {
        this.log("Error creating device:", deviceErr);
        return;
      }

      this.client.on("connect", () => this.onConnect());
      this.client.on("message", (topic: string, message: any) =>
        this.onMessage(topic, message)
      );
      this.client.on("error", (error: Error | string) => this.onError(error));
      this.client.on("reconnect", () => this.onReconnect());
      this.client.on("offline", () => this.onOffline());
      this.client.on("close", () => this.onClose());
    });
  }

  public disconnect(): Observable<null> {
    return Observable.create((observer: Observer<null>) => {
      this.client.end(true, () => {
        observer.next(null);
        observer.complete();
      });
    });
  }

  public updateCredentials(credentials: AWS.CognitoIdentityCredentials) {
    this.client.updateWebSocketCredentials(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.sessionToken,
      credentials.expireTime
    );
  }

  public send(topic: string, message: any) {
    this.client.publish(topic, message);
  }

  public subscribe(topic: string) {
    if (this.client) {
      this.client.subscribe(topic);
      this.log("Subscribed to topic:", topic);
    } else {
      this.topics.push(topic);
      this.log("Deferring subscription of topic:", topic);
    }
  }

  public unsubscribe(topic: string) {
    if (this.client) {
      this.client.unsubscribe(topic);
      this.log("Unubscribed from topic:", topic);
    }
  }

  private onConnect() {
    this.events.next({ type: IotEventType.Connect });
    for (const topic of this.topics) {
      this.log("Trying to connect to topic:", topic);
      this.subscribe(topic);
    }

    this.topics = new Array<string>();
  }

  private onMessage(topic: string, message: any) {
    this.log(`Message received from topic: ${topic}`, JSON.parse(message));
    this.events.next({
      type: IotEventType.Message,
      topic: topic,
      message: JSON.parse(message)
    });
  }

  private onClose() {
    this.events.next({ type: IotEventType.Close });
  }

  private onError(error: Error | string) {
    this.events.next({ type: IotEventType.Error, error: error });
  }

  private onReconnect() {
    this.events.next({ type: IotEventType.Reconnect });
  }

  private onOffline() {
    this.events.next({ type: IotEventType.Offline });
  }

  private log(...args: any[]) {
    if (console && this.debugMode) {
      console.log(...args);
    }
  }
}

export { DeviceOptions } from "aws-iot-device-sdk";

export interface IotEvent {
  type: IotEventType;
  topic?: string;
  message?: object;
  error?: Error | string;
}

export enum IotEventType {
  Connect = "connect",
  Message = "message",
  Close = "close",
  Error = "error",
  Reconnect = "reconnect",
  Offline = "offline"
}
