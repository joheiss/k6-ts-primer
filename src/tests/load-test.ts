import { faker } from "@faker-js/faker";
import { check, group, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { Trend } from "k6/metrics";
import type { Options } from "k6/options";
import { Logger } from "../utils/logger";
import { setupUserCredentials } from "../utils/setupUserCredentials";

// ------------------
// *** INIT STAGE ***
// ------------------
Logger.info("*** INIT STAGE ***");

// define a custom Trend metric to track login response times
const loginResponseTrend = new Trend("login_response_time");

export const options: Options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "30s", target: 10 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    "http_req_duration{expected_response:true}": ["p(95)<200", "max<250"], // 95% of requests must complete below 200ms
    // ... with separate thresholds for different status codes (tags)
    "http_req_duration{status:200}": ["p(95)<150", "max<200"], // 95% of successful requests must complete below 150ms
    "http_req_duration{status:201}": ["p(95)<200", "max<250"], // 95% of successful requests must complete below 150ms
    "group_duration{group:::main page}": ["p(95)<200"],
    "group_duration{group:::main page::assets}": ["p(95)<200"],
    http_req_failed: ["rate<0.01"], // http errors should be less than 1%
    http_reqs: ["count>=3", "rate>=0.5"], // at least 3 requests should be made
    vus: ["value>=0"], // only 1 VU should be running
    checks: ["rate>0.90"], // 99% of checks should pass
    "checks{step:create_user_check}": ["rate>0.95"], // 95  % of user creation checks should pass
    // define threshold for custom login response time metric
    login_response_time: ["p(95)<300", "p(99)<400"], // 95% of login requests must complete below 300ms
  },
};

// -------------------
// *** SETUP STAGE ***
// -------------------
export function setup() {
  Logger.info("*** SETUP STAGE ***");
  const users = [];
  for (let i = 0; i < 10; i++) {
    users.push({ username: faker.internet.username(), password: "topSecret" });
  }
  return { users };
}
// ----------------
// *** VU STAGE ***
// ----------------
export default function test(data: any) {
  // Logger.info("Hello, k6 with TypeScript!");
  Logger.info("*** VU STAGE ***: " + exec.scenario.iterationInTest);

  if (exec.scenario.iterationInTest === 0) {
    console.log(data);
  }

  // main page
  group("main page", () => {
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
    // fetch main page assets
    group("assets", () => {
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/assets/0.CnMgHJlx.css"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/entry/start.C_rsimbV.js"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/chunks/Be8Ud0a9.js"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/chunks/uWbUvUDx.js"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/chunks/Bp10ps_z.js"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/chunks/WXzZokYn.js"
      );
      // ...
      http.get("https://quickpizza.grafana.com/images/pizza.png");
      http.get("https://quickpizza.grafana.com/api/config");
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/nodes/1.B6gn9yZo.js"
      );
      http.get(
        "https://quickpizza.grafana.com/_app/immutable/assets/4.BxvBF2U3.css"
      );
      // ...
    });
  });

  sleep(1);

  const creds = setupUserCredentials();
  // const creds = data.users[exec.scenario.iterationInTest % data.users.length];
  // user signup
  group("user signup", () => {
    const res2 = http.post(
      "https://quickpizza.grafana.com/api/users",
      JSON.stringify(creds),
      { tags: { step: "create_user" } }
    );
    check(
      res2,
      {
        "user successfully created - status is 201": (r) => r.status === 201,
      },
      { step: "create_user_check" }
    );
  });

  sleep(1);

  // user login
  group("user login", () => {
    const res3 = http.post(
      "https://quickpizza.grafana.com/login",
      JSON.stringify(creds)
    );
    // record the login response time in the custom Trend metric
    loginResponseTrend.add(res3.timings.duration);
    check(res3, {
      "login successful - status is 200": (r) => r.status === 200,
    });
  });

  sleep(1);
}

// ----------------------
// *** TEARDOWN STAGE ***
// ----------------------
export function teardown(data: any) {
  Logger.info("*** TEARDOWN STAGE ***");
  console.log(data);
}
