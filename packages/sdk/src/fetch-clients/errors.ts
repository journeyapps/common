import * as micro_errors from '@journeyapps/micro-errors';

export class TimeoutError extends Error {
  constructor() {
    super();

    this.message = 'Request timed out';
    this.name = 'TimeoutError';
  }
}

export class UnparsableServiceResponse extends micro_errors.JourneyError {
  constructor(endpoint: string, status: number, raw?: string) {
    super({
      code: 'UNPARSABLE_SERVICE_RESPONSE',
      status: status,
      description: 'Could not parse service response',
      details: `${endpoint}\n${raw || 'unparseable'}`
    });
  }
}
