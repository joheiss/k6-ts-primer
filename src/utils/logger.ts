export const getTimestamp = (): string => {
  return new Date().toISOString();
};

export class Logger {
  public static info(...val: any) {
    console.log(`[INFO] [${getTimestamp()}]:`, ...val);
  }
  public static warn(...val: any) {
    console.warn(`[WARN] [${getTimestamp()}]:`, ...val);
  }
  public static error(...val: any) {
    console.error(`[ERROR] [${getTimestamp()}]:`, ...val);
  }
}

export const logWaitingTime = ({
  metric,
  response,
  messageType,
}: {
  metric: any;
  response: any;
  messageType: string;
}) => {
  const responseTimeThreshold = 100; // in milliseconds
  let correlationId = "4711";
  let responseTime = response.timings.waiting;
  try {
    // const json = response.json();
    // correlationId = json.correlationId;
  } catch (e) {
    Logger.warn(`Failed to parse JSON response for ${messageType}:`, e);
  }
  if (responseTime > responseTimeThreshold) {
    Logger.warn(
      `High response time detected for ${messageType}. Correlation ID: ${correlationId}, Response Time: ${responseTime} ms`
    );
  }
  metric.add(responseTime);
};
