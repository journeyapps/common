import { isLogToken, LogColor, LogStyle } from '../Log.js';
import { LogLevel } from '../Logger.js';
import { LoggerTransport } from '../LoggerTransport.js';

const FOREGROUND_COLORS: Record<LogColor, number> = {
  [LogColor.RED]: 31,
  [LogColor.GREEN]: 32,
  [LogColor.YELLOW]: 33,
  [LogColor.BLUE]: 34,
  [LogColor.PURPLE]: 35,
  [LogColor.CYAN]: 36,
  [LogColor.GRAY]: 90
};

const BACKGROUND_COLORS: Record<LogColor, number> = {
  [LogColor.RED]: 41,
  [LogColor.GREEN]: 42,
  [LogColor.YELLOW]: 43,
  [LogColor.BLUE]: 44,
  [LogColor.PURPLE]: 45,
  [LogColor.CYAN]: 46,
  [LogColor.GRAY]: 100
};

const RESET_STYLE = '\u001b[0m';

const styleToANSI = (style: LogStyle): string => {
  const codes: number[] = [];
  if (style.bold) {
    codes.push(1);
  }
  if (style.dim) {
    codes.push(2);
  }
  if (style.foreground) {
    codes.push(FOREGROUND_COLORS[style.foreground]);
  }
  if (style.background) {
    codes.push(BACKGROUND_COLORS[style.background]);
  }
  return codes.length > 0 ? `\u001b[${codes.join(';')}m` : '';
};

const valueSpecifier = (value: unknown): string => {
  return (typeof value === 'object' && value !== null) || typeof value === 'function' ? '%o' : '%s';
};

export const formatNodeConsoleArguments = (name: string, data: unknown[]): unknown[] => {
  if (!data.some(isLogToken)) {
    return [`[${name}]`, ...data];
  }

  const format: string[] = ['%s'];
  const values: unknown[] = [`[${name}]`];

  data.forEach((item) => {
    if (isLogToken(item)) {
      const ansi = styleToANSI(item.style);
      format.push(`${ansi}${valueSpecifier(item.value)}${ansi ? RESET_STYLE : ''}`);
      values.push(item.value);
      return;
    }
    format.push(valueSpecifier(item));
    values.push(item);
  });

  return [format.join(' '), ...values];
};

export class NodeConsoleLoggerTransport extends LoggerTransport {
  log(level: LogLevel, name: string, data: unknown[]) {
    const payload = formatNodeConsoleArguments(name, data);
    if (level === LogLevel.DEBUG) {
      console.debug(...payload);
    } else if (level === LogLevel.ERROR) {
      console.error(...payload);
    } else if (level === LogLevel.WARN) {
      console.warn(...payload);
    } else {
      console.log(...payload);
    }
  }
}
