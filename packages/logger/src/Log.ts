export enum LogColor {
  RED = 'red',
  GREEN = 'green',
  YELLOW = 'yellow',
  BLUE = 'blue',
  PURPLE = 'purple',
  CYAN = 'cyan',
  GRAY = 'gray'
}

export interface LogStyle {
  foreground?: LogColor;
  background?: LogColor;
  bold?: boolean;
  dim?: boolean;
}

const LOG_TOKEN = Symbol.for('@journeyapps/common-logger/log-token');

export class LogToken {
  readonly [LOG_TOKEN] = true;

  constructor(
    readonly value: unknown,
    readonly style: LogStyle
  ) {}

  toString() {
    return String(this.value);
  }
}

export const isLogToken = (value: unknown): value is LogToken => {
  return !!value && typeof value === 'object' && (value as LogToken)[LOG_TOKEN] === true;
};

const styled = (value: unknown, style: LogStyle): LogToken => {
  if (isLogToken(value)) {
    return new LogToken(value.value, {
      ...value.style,
      ...style
    });
  }
  return new LogToken(value, style);
};

export class Log {
  static style(value: unknown, style: LogStyle) {
    return styled(value, style);
  }

  static red(value: unknown) {
    return styled(value, { foreground: LogColor.RED });
  }

  static green(value: unknown) {
    return styled(value, { foreground: LogColor.GREEN });
  }

  static yellow(value: unknown) {
    return styled(value, { foreground: LogColor.YELLOW });
  }

  static blue(value: unknown) {
    return styled(value, { foreground: LogColor.BLUE });
  }

  static purple(value: unknown) {
    return styled(value, { foreground: LogColor.PURPLE });
  }

  static cyan(value: unknown) {
    return styled(value, { foreground: LogColor.CYAN });
  }

  static gray(value: unknown) {
    return styled(value, { foreground: LogColor.GRAY });
  }

  static bold(value: unknown) {
    return styled(value, { bold: true });
  }

  static dim(value: unknown) {
    return styled(value, { dim: true });
  }

  static error(value: unknown) {
    return Log.red(value);
  }

  static success(value: unknown) {
    return Log.green(value);
  }

  static warning(value: unknown) {
    return Log.yellow(value);
  }

  static info(value: unknown) {
    return Log.cyan(value);
  }
}
