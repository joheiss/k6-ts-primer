import { sleep } from "k6";
import http from "k6/http";
import type { Options } from "k6/options";

export const options: Options = {
  stages: [
    { duration: "2h", target: 1_000_000 }
  ],
};

export default function test() {
  http.get("https://quickpizza.grafana.com/");
  sleep(1);
}
