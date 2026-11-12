import { describe, expect, it, vi } from 'vitest';
import {
  ConsoleLoggerTransport,
  formatConsoleArguments,
  formatNodeConsoleArguments,
  Log,
  LogLevel,
  Logger,
  LoggerTransport,
  NodeConsoleLoggerTransport
} from '../src/index.js';

class TestTransport extends LoggerTransport {
  entries: { level: LogLevel; name: string; data: unknown[] }[] = [];

  log(level: LogLevel, name: string, data: unknown[]): void {
    this.entries.push({ level, name, data });
  }
}

describe('Logger', () => {
  it('filters using conventional severity ordering', () => {
    const transport = new TestTransport();
    const logger = new Logger({ name: 'test', level: LogLevel.WARN, transport });

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(transport.entries.map((entry) => entry.level)).toEqual([LogLevel.WARN, LogLevel.ERROR]);
  });

  it('updates levels at runtime and supports OFF', () => {
    const transport = new TestTransport();
    const logger = new Logger({ name: 'test', level: LogLevel.ERROR, transport });

    logger.warn('hidden');
    logger.setLevel(LogLevel.DEBUG);
    logger.debug('visible');
    logger.setLevel(LogLevel.OFF);
    logger.error('hidden');

    expect(transport.entries.map((entry) => entry.data)).toEqual([['visible']]);
  });

  it('creates cached children with inherited configuration', () => {
    const parentTransport = new TestTransport();
    const replacementParentTransport = new TestTransport();
    const childTransport = new TestTransport();
    const logger = new Logger({ name: 'module', level: LogLevel.INFO, transport: parentTransport });
    const child = logger.childLogger('store');

    expect(child.name).toBe('module:store');
    expect(logger.childLogger('store')).toBe(child);
    expect(child.level).toBe(LogLevel.INFO);
    expect(child.transport).toBe(parentTransport);

    logger.setLevel(LogLevel.DEBUG);
    expect(child.level).toBe(LogLevel.DEBUG);

    child.setLevel(LogLevel.ERROR);
    logger.setLevel(LogLevel.INFO);
    expect(child.level).toBe(LogLevel.ERROR);

    child.setTransport(childTransport);
    logger.setTransport(replacementParentTransport);
    expect(child.transport).toBe(childTransport);
    child.error('local');
    child.clearLevel();
    child.clearTransport();
    expect(child.level).toBe(LogLevel.INFO);
    expect(child.transport).toBe(replacementParentTransport);
    child.info('inherited');

    expect(childTransport.entries).toHaveLength(1);
    expect(replacementParentTransport.entries[replacementParentTransport.entries.length - 1]?.name).toBe(
      'module:store'
    );
  });

  it('notifies children when inherited configuration changes', () => {
    const logger = new Logger({ name: 'module' });
    const child = logger.childLogger('store');
    const listener = vi.fn();
    child.registerConfigurationListener(listener);

    logger.setLevel(LogLevel.DEBUG);

    expect(listener).toHaveBeenCalledWith(child);
  });
});

describe('Log styling', () => {
  it('preserves ordinary console arguments when no style tokens exist', () => {
    const object = { id: 1 };
    expect(formatConsoleArguments('test', ['message', object])).toEqual(['[test]', 'message', object]);
  });

  it('formats mixed values as browser console styles', () => {
    const object = { id: 1 };
    const payload = formatConsoleArguments('test', [
      'test:',
      Log.red('error stuffs'),
      'and',
      Log.green('success'),
      object
    ]);

    expect(payload[0]).toBe('%s %s %c%s%c %s %c%s%c %o');
    expect(payload).toContain('color: #e05252');
    expect(payload).toContain('color: #35a854');
    expect(payload[payload.length - 1]).toBe(object);
  });

  it('composes styles', () => {
    const payload = formatConsoleArguments('test', [Log.bold(Log.red('important'))]);
    expect(payload).toContain('color: #e05252; font-weight: bold');
  });

  it('routes styled logs through the existing variadic methods', () => {
    const transport = new ConsoleLoggerTransport();
    const logger = new Logger({ name: 'test', level: LogLevel.INFO, transport });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('result:', Log.green('success'));

    expect(spy).toHaveBeenCalledWith('%s %s %c%s%c', '[test]', 'result:', 'color: #35a854', 'success', '');
    spy.mockRestore();
  });

  it('formats mixed values as Node ANSI styles', () => {
    const object = { id: 1 };
    const payload = formatNodeConsoleArguments('test', [
      'test:',
      Log.red('error stuffs'),
      'and',
      Log.bold(Log.green('success')),
      object
    ]);

    expect(payload).toEqual([
      '%s %s \u001b[31m%s\u001b[0m %s \u001b[1;32m%s\u001b[0m %o',
      '[test]',
      'test:',
      'error stuffs',
      'and',
      'success',
      object
    ]);
  });

  it('preserves ordinary Node console arguments when no style tokens exist', () => {
    const object = { id: 1 };
    expect(formatNodeConsoleArguments('test', ['message', object])).toEqual(['[test]', 'message', object]);
  });

  it('routes styled logs through the Node console transport', () => {
    const transport = new NodeConsoleLoggerTransport();
    const logger = new Logger({ name: 'test', level: LogLevel.INFO, transport });
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('result:', Log.green('success'));

    expect(spy).toHaveBeenCalledWith('%s %s \u001b[32m%s\u001b[0m', '[test]', 'result:', 'success');
    spy.mockRestore();
  });
});
