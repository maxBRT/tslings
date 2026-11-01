// A tiny HTTP framework, written like a library you would install from npm. `augment1.ts` uses
// it. Don't edit this file: the point of the exercise is to extend its types from the outside.

export interface HttpRequest {
  readonly method: string;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
}

export type HttpResponse = { status: number; body: string };

/** Runs before the handler. Returning a response stops the request there. */
export type Middleware = (request: HttpRequest) => HttpResponse | undefined;

export type Handler = (request: HttpRequest) => HttpResponse;

export function createApp(
  middlewares: readonly Middleware[],
  handler: Handler,
): (request: HttpRequest) => HttpResponse {
  return (request) => {
    for (const middleware of middlewares) {
      const response = middleware(request);
      if (response !== undefined) return response;
    }
    return handler(request);
  };
}
