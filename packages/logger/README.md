# JourneyApps Common Logger

`@journeyapps/common-logger` provides named loggers with configurable levels, inherited configuration and styled output.

## Usage

```ts
import { Logger, LogLevel, Log } from '@journeyapps/common-logger';

const logger = new Logger({ name: 'application', level: LogLevel.INFO });
logger.info('Started', Log.success('ready'));

const requests = logger.childLogger('requests');
requests.info('Loading', { id: '123' });

logger.setLevel(LogLevel.DEBUG);
requests.debug('Request details');
```

The default level is `LogLevel.WARN`. Levels are `OFF`, `ERROR`, `WARN`, `INFO` and `DEBUG`; a configured level includes messages at that level and higher severity.

Child loggers inherit their parent's level and transport unless overridden. `childLogger(name)` reuses an existing child with that name. Use `clearLevel()` or `clearTransport()` to resume inheritance after an override.

## Transports and styling

The default `ConsoleLoggerTransport` uses console methods and browser CSS styling. For ANSI-styled terminal output, supply `NodeConsoleLoggerTransport`:

```ts
import { Logger, LogLevel, NodeConsoleLoggerTransport } from '@journeyapps/common-logger';

const logger = new Logger({
  name: 'worker',
  level: LogLevel.INFO,
  transport: new NodeConsoleLoggerTransport()
});
```

Pass styled values directly as log arguments: `Log.success(value)`, `Log.warning(value)`, `Log.error(value)`, `Log.bold(value)` or `Log.style(value, style)`. Custom transports extend `LoggerTransport` and implement `log(level, name, data)`.

## Development

From the workspace root:

```sh
pnpm --filter @journeyapps/common-logger test
```
