import { Logger, logWaitingTime } from "../utils/logger";
import http from "k6/http";
import { Trend } from "k6/metrics";

export const options = {
  vus: 5,
  duration: "5s",
};

const getReponseTime = new Trend("get_user_response_time", true);

export default function test() {
  Logger.info("Hello, k6 with TypeScript!");
  const res = http.get("https://quickpizza.grafana.com/");
  logWaitingTime({
    metric: getReponseTime,
    response: res,
    messageType: "simple test request",
  });
}
