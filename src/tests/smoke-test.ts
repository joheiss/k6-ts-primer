import { check, sleep } from "k6";
import http from "k6/http";
import exec from "k6/execution";
import type { Options } from "k6/options";
import { setupUserCredentials } from "../utils/setupUserCredentials";

export const options: Options = {
  vus: 1,
  iterations: 1,
  duration: "5s",
  thresholds: {
    http_req_duration: ["p(95)<200", "max<250"], // 95% of requests must complete below 200ms
    http_req_failed: ["rate<0.01"], // http errors should be less than 1%
    http_reqs: ["count>=3", "rate>=0.5"], // at least 3 requests should be made
    vus: ["value==1"], // only 1 VU should be running
  },
};

export default function test() {
  console.log(exec.scenario.iterationInTest)
  const res = http.get("https://quickpizza.grafana.com/");
  check(res, { "page found - status is 200": (r) => r.status === 200 });
  check(res.body, {
    "response body is not empty": (body: any) =>
      body != null && body.length > 0,
  });
  check(res.body, {
    "response body contains QuickPizza": (body: any) =>
      body?.includes("QuickPizza"),
  });
  sleep(1);
  // create user
  const creds = setupUserCredentials();
  const res2 = http.post(
    "https://quickpizza.grafana.com/api/users",
    JSON.stringify(creds)
  );
  check(res2, {
    "user successfully created - status is 201": (r) => r.status === 201,
  });
  sleep(1);
  // login user
  const res3 = http.post(
    "https://quickpizza.grafana.com/login",
    JSON.stringify(creds)
  );
  check(res3, { "login successful - status is 200": (r) => r.status === 200 });
  sleep(1);
}
