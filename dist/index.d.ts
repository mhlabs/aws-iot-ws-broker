import { Subject } from 'rxjs/Subject';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
export default class AwsIot {
    private region;
    private identityPoolId;
    private debugMode;
    events: Subject<{
        [key: string]: any;
        type: IotEvent;
    }>;
    private client;
    private topics;
    constructor(region: string, identityPoolId: string, debugMode?: boolean);
    connect(): void;
    send(topic: string, message: any): void;
    subscribe(topic: string): void;
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
