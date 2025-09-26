export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

export function assert(condition, message, details = null) {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}
