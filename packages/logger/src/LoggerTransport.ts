import { LogLevel } from './Logger.js';

export abstract class LoggerTransport {
  abstract log(level: LogLevel, name: string, data: unknown[]): void;
}
