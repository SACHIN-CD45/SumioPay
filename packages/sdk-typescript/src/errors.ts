export class SumioPayError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: any;

  constructor(message: string, code = 'SUMIO_ERROR', statusCode?: number, details?: any) {
    super(message);
    this.name = 'SumioPayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class SumioAuthError extends SumioPayError {
  constructor(message = 'Invalid API key or authentication credentials') {
    super(message, 'AUTHENTICATION_FAILED', 401);
    this.name = 'SumioAuthError';
  }
}

export class SumioValidationError extends SumioPayError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_FAILED', 400, details);
    this.name = 'SumioValidationError';
  }
}

export class SumioNotFoundError extends SumioPayError {
  constructor(message = 'Requested payment resource not found') {
    super(message, 'NOT_FOUND', 404);
    this.name = 'SumioNotFoundError';
  }
}

export class SumioNetworkError extends SumioPayError {
  constructor(message = 'Network error communicating with SumioPay API') {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'SumioNetworkError';
  }
}

export class SumioSignatureVerificationError extends SumioPayError {
  constructor(message = 'Webhook cryptographic signature validation failed') {
    super(message, 'INVALID_SIGNATURE', 400);
    this.name = 'SumioSignatureVerificationError';
  }
}
