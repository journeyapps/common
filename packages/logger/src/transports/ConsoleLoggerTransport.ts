import { isLogToken, LogColor, LogStyle, LogToken } from '../Log.js';
import { LoggerTransport } from '../LoggerTransport.js';
import { LogLevel } from '../Logger.js';

const COLORS: Record<LogColor, string> = {
  [LogColor.RED]: '#e05252',
  [LogColor.GREEN]: '#35a854',
  [LogColor.YELLOW]: '#d6a13a',
  [LogColor.BLUE]: '#4187e1',
  [LogColor.PURPLE]: '#a56de2',
  [LogColor.CYAN]: '#2aa6b7',
  [LogColor.GRAY]: '#858b98'
};

const styleToCSS = (style: LogStyle): string => {
  const rules: string[] = [];
  if (style.foreground) {
    rules.push(`color: ${COLORS[style.foreground]}`);
  }
  if (style.background) {
    rules.push(`background-color: ${COLORS[style.background]}`);
  }
  if (style.bold) {
    rules.push('font-weight: bold');
  }
  if (style.dim) {
    rules.push('opacity: 0.65');
  }
  return rules.join('; ');
};

const valueSpecifier = (value: unknown): string => {
  return (typeof value === 'object' && value !== null) || typeof value === 'function' ? '%o' : '%s';
};

export const formatConsoleArguments = (name: string, data: unknown[]): unknown[] => {
  if (!data.some(isLogToken)) {
    return [`[${name}]`, ...data];
  }

  const format: string[] = ['%s'];
  const values: unknown[] = [`[${name}]`];

  data.forEach((item) => {
    if (isLogToken(item)) {
      const token = item as LogToken;
      format.push(`%c${valueSpecifier(token.value)}%c`);
      values.push(styleToCSS(token.style), token.value, '');
      return;
    }
    format.push(valueSpecifier(item));
    values.push(item);
  });

  return [format.join(' '), ...values];
};

export class ConsoleLoggerTransport extends LoggerTransport {
  log(level: LogLevel, name: string, data: unknown[]) {
    const payload = formatConsoleArguments(name, data);
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
