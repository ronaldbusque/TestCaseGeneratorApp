interface LogData {
  [key: string]: any;
}

function formatLogMessage(message: string, data?: LogData): string {
  const timestamp = new Date().toISOString();
  const dataString = data ? `: ${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] ${message}${dataString}`;
}

export function logInfo(message: string, data?: LogData) {
  const formattedMessage = formatLogMessage(message, data);
  console.log(`[INFO] ${formattedMessage}`);
}

export function logWarning(message: string, data?: LogData) {
  const formattedMessage = formatLogMessage(message, data);
  console.warn(`[WARN] ${formattedMessage}`);
}

export function logError(message: string, error: any, data?: LogData) {
  const errorDetails = {
    message: error?.message,
    stack: error?.stack,
    ...data
  };
  const formattedMessage = formatLogMessage(message, errorDetails);
  console.error(`[ERROR] ${formattedMessage}`);
}

export function logDebug(message: string, data?: LogData) {
  if (process.env.NODE_ENV === 'development') {
    const formattedMessage = formatLogMessage(message, data);
    console.debug(`[DEBUG] ${formattedMessage}`);
  }
}

export function logPerformance(operation: string, startTime: number, data?: LogData) {
  const duration = Date.now() - startTime;
  logInfo(`${operation} completed in ${duration}ms`, {
    duration,
    ...data
  });
} 