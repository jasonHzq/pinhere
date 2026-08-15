export type ApiErrorBody = {
  error: { code: string; message: string; requestId: string };
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: 400 | 401 | 403 | 404 | 409 | 412 | 413 | 422 | 429 | 500 | 502 | 503
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  const known = error instanceof ApiError;
  const body: ApiErrorBody = {
    error: {
      code: known ? error.code : "internal_error",
      message: known ? error.message : "An unexpected error occurred",
      requestId: `req_${crypto.randomUUID().replaceAll("-", "")}`
    }
  };
  if (!known) console.error(error);
  return Response.json(body, { status: known ? error.status : 500 });
}
