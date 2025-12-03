export class ServiceError extends Error {
  constructor(
    public statusCode: number,
    public body: Record<string, unknown>,
    message?: string
  ) {
    super(message ?? (typeof body.error === "string" ? (body.error as string) : "ServiceError"));
    this.name = "ServiceError";
  }
}
