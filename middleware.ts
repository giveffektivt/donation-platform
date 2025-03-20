import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import Cors from "cors";

export async function middleware(request: NextRequest) {
  const headers = await executeCors(request);
  const response = NextResponse.next();
  for (const [key, value] of headers.entries()) {
    response.headers.set(key, value);
  }
  return response;
}

async function executeCors(request: NextRequest): Promise<Headers> {
  const mockRequest = {
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
  };

  return new Promise((resolve, reject) => {
    const headers = new Headers();
    const mockResponse = {
      getHeader: (key: string) => headers.get(key),
      setHeader: (key: string, value: string) => headers.set(key, value),
      end: () => resolve(headers),
    };

    Cors({
      origin: [
        "https://giveffektivt.dk",
        ...(process.env.DEV_WEBSITE_DOMAINS
          ? process.env.DEV_WEBSITE_DOMAINS.split(",")
          : []),
      ],
    })(mockRequest, mockResponse, (error) =>
      error ? reject(error) : resolve(headers),
    );
  });
}
