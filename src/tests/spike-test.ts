import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

export const options: Options = {
  stages: [
    { duration: "1s", target: 30 },
    { duration: "1s", target: 0 },
    { duration: "2s", target: 60 },
    { duration: "1s", target: 0 },
  ],
};

export default function test() {
  http.get("https://quickpizza.grafana.com/");
  sleep(1);
}
