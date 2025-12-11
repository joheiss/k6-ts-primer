import { sleep } from "k6";
import http from "k6/http";
import { Logger } from "../utils/logger";
import { setupUserCredentials } from "../utils/setupUserCredentials";
import type { Options } from "k6/options";

export const options: Options = {
  stages: [
    { duration: "5m", target: 1000 },
    { duration: "24h", target: 100 },
    { duration: "15m", target: 0 },
  ],
};

export default function test() {
  Logger.info("Hello, k6 with TypeScript!");
  http.get("https://quickpizza.grafana.com/");
  sleep(1);
  const creds = setupUserCredentials();
  const res2 = http.post(
    "https://quickpizza.grafana.com/api/users",
    JSON.stringify(creds)
  );
  console.log(res2.status, res2.body);
  sleep(1);
  const res3 = http.post(
    "https://quickpizza.grafana.com/login",
    JSON.stringify(creds)
  );
  console.log(res3.status);
  sleep(1);
}
