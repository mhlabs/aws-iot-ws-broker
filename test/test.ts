import AwsIot from "..";
import { expect } from "chai";
import { Observable } from "rxjs";
import { take } from "rxjs/operators";

describe("AWS IOT websocket broker", () => {
  let awsIot: AwsIot;

  beforeEach(() => {
    awsIot = new AwsIot();
  });

  it("should throw an error when connecting without a config", () => {
    expect(awsIot.connect.bind(awsIot)).to.throw(
      Error,
      "No AWS Cognito credentials provided"
    );
  });

  it("should return an observable when subscribing to topic", () => {
    const topic = "some-topic";
    const observable = awsIot.subscribe(topic);
    expect(observable).to.be.instanceOf(Observable);
  });

  it("should defer topic subscriptions before the client is ready", () => {
    const topic = "some-topic";
    const observable = awsIot.subscribe(topic);
    observable.pipe(take(1)).subscribe(() => {});
    expect((awsIot["_deferredTopics"] as [{topic: string}]).map(dT => dT.topic)).to.include(topic);
  });
});
