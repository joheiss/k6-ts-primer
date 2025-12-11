import { sleep } from "k6";
import http from "k6/http";
import { Logger } from "../utils/logger";
import { setupUserCredentials } from "../utils/setupUserCredentials";

export const options = {
  stages: [
    { duration: "10s", target: 20 },
    { duration: "30s", target: 20 },
    { duration: "10s", target: 0 },
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
