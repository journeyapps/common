import { LoggerTransport } from './LoggerTransport.js';
import { ConsoleLoggerTransport } from './transports/ConsoleLoggerTransport.js';

export enum LogLevel {
  OFF = 'OFF',
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.OFF]: -1,
  [LogLevel.ERROR]: 0,
  [LogLevel.WARN]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.DEBUG]: 3
};

const DEFAULT_LOG_LEVEL = LogLevel.WARN;
const DEFAULT_TRANSPORT = new ConsoleLoggerTransport();

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  transport?: LoggerTransport;
  parent?: Logger;
}

export type LoggerConfigurationListener = (logger: Logger) => void;

export class Logger {
  private readonly childLoggers = new Map<string, Logger>();
  private readonly configurationListeners = new Set<LoggerConfigurationListener>();
  private localLevel?: LogLevel;
  private localTransport?: LoggerTransport;

  constructor(private readonly options: LoggerOptions) {
    this.localLevel = options.level;
    this.localTransport = options.transport;
  }

  get name() {
    return this.options.name;
  }

  get level(): LogLevel {
    return this.localLevel ?? this.options.parent?.level ?? DEFAULT_LOG_LEVEL;
  }

  get transport(): LoggerTransport {
    return this.localTransport ?? this.options.parent?.transport ?? DEFAULT_TRANSPORT;
  }

  get children(): Logger[] {
    return Array.from(this.childLoggers.values());
  }

  setLevel(level: LogLevel) {
    if (this.localLevel === level) {
      return;
    }
    this.localLevel = level;
    this.notifyConfigurationChanged();
  }

  clearLevel() {
    if (this.localLevel === undefined) {
      return;
    }
    this.localLevel = undefined;
    this.notifyConfigurationChanged();
  }

  setTransport(transport: LoggerTransport) {
    if (this.localTransport === transport) {
      return;
    }
    this.localTransport = transport;
    this.notifyConfigurationChanged();
  }

  clearTransport() {
    if (this.localTransport === undefined) {
      return;
    }
    this.localTransport = undefined;
    this.notifyConfigurationChanged();
  }

  registerConfigurationListener(listener: LoggerConfigurationListener): () => void {
    this.configurationListeners.add(listener);
    return () => this.configurationListeners.delete(listener);
  }

  isEnabled(level: LogLevel): boolean {
    if (this.level === LogLevel.OFF || level === LogLevel.OFF) {
      return false;
    }
    return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[this.level];
  }

  log(level: LogLevel, args: unknown[]) {
    if (!this.isEnabled(level)) {
      return;
    }
    this.transport.log(level, this.name, args);
  }

  debug(...args: unknown[]) {
    this.log(LogLevel.DEBUG, args);
  }

  info(...args: unknown[]) {
    this.log(LogLevel.INFO, args);
  }

  error(...args: unknown[]) {
    this.log(LogLevel.ERROR, args);
  }

  warn(...args: unknown[]) {
    this.log(LogLevel.WARN, args);
  }

  childLogger(name: string): Logger {
    const existing = this.childLoggers.get(name);
    if (existing) {
      return existing;
    }

    const child = new Logger({
      name: `${this.name}:${name}`,
      parent: this
    });
    this.childLoggers.set(name, child);
    this.notifyConfigurationChanged();
    return child;
  }

  /** @deprecated Use childLogger() instead. */
  createLogger(name: string): Logger {
    return this.childLogger(name);
  }

  private notifyConfigurationChanged() {
    this.configurationListeners.forEach((listener) => listener(this));
    this.childLoggers.forEach((child) => child.notifyConfigurationChanged());
  }
}
