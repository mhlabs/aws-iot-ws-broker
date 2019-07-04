import { device, DeviceOptions } from "aws-iot-device-sdk";
import { Subject, Observer, Observable } from "rxjs";
import * as AWS from "aws-sdk";
import { v4 as uuidV4 } from "uuid";
import * as pako from "pako";

export default class AwsIot {
  get events(): Observable<IotEvent> {
    return this._events.asObservable();
  }

  get topicsForTest(): Array<IDeferredTopic> {
    return this._deferredTopics;
  } 

  private _client!: device;
  private _deferredTopics = new Array<IDeferredTopic>();
  private _events = new Subject<IotEvent>();

  constructor(private debugMode = false) {}

  connect(
    creds: AWS.CognitoIdentityCredentials,
    policyName: string,
    iotEndpoint: string,
    region: string
  ) {
    if (!creds) {
      throw new Error("AwsIot: No AWS Cognito credentials provided");
    }

    AWS.config.credentials = creds;
    AWS.config.region = region;

    if (!AWS.config.region) {
      throw new Error("AwsIot: No region in environment.");
    }

    const iot = new AWS.Iot({ region: AWS.config.region });

    if (!policyName) {
      this.createDevice(iot, creds, iotEndpoint);
      return;
    }

    const principal = creds.identityId;

    iot.attachPrincipalPolicy(
      { policyName: policyName, principal: principal },
      policyErr => {
        if (policyErr) {
          this.log("AwsIot: Error attaching policy:", policyErr);
          return;
        }

        this.createDevice(iot, creds, iotEndpoint);
      }
    );
  }

  private createDevice(
    iot: AWS.Iot,
    creds: AWS.CognitoIdentityCredentials,
    iotEndpoint: string
  ) {
    const config: DeviceOptions = {
      clientId: uuidV4(),
      region: AWS.config.region,
      protocol: "wss",
      accessKeyId: creds.accessKeyId,
      secretKey: creds.secretAccessKey,
      sessionToken: creds.sessionToken,
      port: 443,
      debug: this.debugMode,
      host: iotEndpoint,
      baseReconnectTimeMs: 500,
      maximumReconnectTimeMs: 2000,
      minimumConnectionTimeMs: 500
    };

    try {
      this._client = new device(config);
    } catch (deviceErr) {
      this.log("AwsIot: Error creating device:", deviceErr);
      return;
    }

    this._client.on("connect", () => this.onConnect());
    this._client.on("message", (topic: string, message: any) =>
      this.onMessage(topic, message)
    );
    this._client.on("error", (error: Error | string) => this.onError(error));
    this._client.on("reconnect", () => this.onReconnect());
    this._client.on("offline", () => this.onOffline());
    this._client.on("close", () => this.onClose());
  }

  disconnect(): Observable<null> {
    return Observable.create((observer: Observer<null>) => {
      this._client.end(true, () => {
        observer.next(null);
        observer.complete();
      });
    });
  }

  updateCredentials(credentials: AWS.CognitoIdentityCredentials) {
    this._client.updateWebSocketCredentials(
      credentials.accessKeyId,
      credentials.secretAccessKey,
      credentials.sessionToken,
      credentials.expireTime
    );
  }

  send(topic: string, message: any) {
    this._client.publish(topic, message);
  }

  subscribe(topic: string): Observable<string> {
    return new Observable((observer: Observer<string>) => {
      if (!this._client) {
        this._deferredTopics = [...this._deferredTopics, { topic, observer }];
        this.log(`AwsIot: Deferring subscription of topic: ${topic}`);
        return;
      }

      this._subscribe(topic, observer);
      this.log(`AwsIot: Subscribed to topic: ${topic}`);
    });
  }

  unsubscribe(topic: string) {
    if (this._client) {
      this._client.unsubscribe(topic);
      this.log(`AwsIot: Unubscribed from topic: ${topic}`);
    }
  }

  private onConnect() {
    this._events.next({ type: IotEventType.Connect });
    for (const { topic, observer } of this._deferredTopics) {
      this.log("AwsIot: Trying to connect to topic:", topic);
      this._subscribe(topic, observer);
    }

    this._deferredTopics = new Array<IDeferredTopic>();
  }

  private decompressMessage(input: any): string {
    const inputString = input.toString();
    const decoded = Buffer.from(inputString, "base64");
    const uncompressed = pako.inflate(decoded, { to: "string" });

    return uncompressed;
  }

  private onMessage(topic: string, message: any) {
    if (topic && topic.endsWith("/gz")) {
      message = this.decompressMessage(message);
    }

    this.log(
      `AwsIot: Message received from topic: ${topic}`,
      JSON.parse(message)
    );
    this._events.next({
      type: IotEventType.Message,
      topic: topic,
      message: JSON.parse(message)
    });
  }

  private _subscribe(topic: string, observer: Observer<string>) {
    if (!this._client) {
      throw new Error("No client exists");
    }

    this._client.subscribe(topic);
    observer.next(topic);
    observer.complete();
  }

  private onClose() {
    this.log("AwsIot: onClose");
    this._events.next({ type: IotEventType.Close });
  }

  private onError(error: Error | string) {
    this.log("AwsIot: onError", error);
    this._events.next({ type: IotEventType.Error, error: error });
  }

  private onReconnect() {
    this.log("AwsIot: onReconnect");
    this._events.next({ type: IotEventType.Reconnect });
  }

  private onOffline() {
    this.log("AwsIot: onOffline");
    this._events.next({ type: IotEventType.Offline });
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

interface IDeferredTopic {
  topic: string;
  observer: Observer<string>;
}
