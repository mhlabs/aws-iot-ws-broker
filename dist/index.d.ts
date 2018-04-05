import { DeviceOptions } from 'aws-iot-device-sdk';
import { Subject } from 'rxjs/Subject';
export default class AwsIot {
    private config;
    events: Subject<{
        [key: string]: any;
        type: IotEvent;
    }>;
    private client;
    private topics;
    constructor(config: DeviceOptions);
    connect(): void;
    send(topic: any, message: any): void;
    subscribe(topic: any): void;
    unsubscribe(topic: string): void;
    private onConnect();
    private onMessage(topic, message);
    private onClose();
    private onError();
    private onReconnect();
    private onOffline();
    private log(...args);
}
export { DeviceOptions } from 'aws-iot-device-sdk';
export declare enum IotEvent {
    Connect = "connect",
    Message = "message",
    Close = "close",
    Error = "error",
    Reconnect = "reconnect",
    Offline = "offline",
}
