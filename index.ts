import { device, DeviceOptions } from "aws-iot-device-sdk";
import { Subject, Observer, Observable } from "rxjs";
import * as AWS from "aws-sdk";
import { v4 as uuidV4 } from "uuid";
import * as pako from "pako";

export default class AwsIot {
  public readonly events = new Subject<IotEvent>();

  private client!: device;
  private topics = new Array<string>();

  constructor(private debugMode = false) {}

  public connect(
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
      this.client = new device(config);
    } catch (deviceErr) {
      this.log("AwsIot: Error creating device:", deviceErr);
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
      this.log("AwsIot: Subscribed to topic:", topic);
    } else {
      this.topics.push(topic);
      this.log("AwsIot: Deferring subscription of topic:", topic);
    }
  }

  public unsubscribe(topic: string) {
    if (this.client) {
      this.client.unsubscribe(topic);
      this.log("AwsIot: Unubscribed from topic:", topic);
    }
  }

  private onConnect() {
    this.events.next({ type: IotEventType.Connect });
    for (const topic of this.topics) {
      this.log("AwsIot: Trying to connect to topic:", topic);
      this.subscribe(topic);
    }

    this.topics = new Array<string>();
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
    this.events.next({
      type: IotEventType.Message,
      topic: topic,
      message: JSON.parse(message)
    });
  }

  private onClose() {
    this.log("AwsIot: onClose");
    this.events.next({ type: IotEventType.Close });
  }

  private onError(error: Error | string) {
    this.log("AwsIot: onError", error);
    this.events.next({ type: IotEventType.Error, error: error });
  }

  private onReconnect() {
    this.log("AwsIot: onReconnect");
    this.events.next({ type: IotEventType.Reconnect });
  }

  private onOffline() {
    this.log("AwsIot: onOffline");
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
