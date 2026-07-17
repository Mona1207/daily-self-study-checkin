import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const worker = `const withCacheHeaders = (response) => {
  const next = new Response(response.body, response);
  next.headers.set("X-Content-Type-Options", "nosniff");
  return next;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) return withCacheHeaders(assetResponse);

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if ((request.method === "GET" || request.method === "HEAD") && acceptsHtml) {
      const indexUrl = new URL("/index.html", url);
      const fallback = await env.ASSETS.fetch(new Request(indexUrl, request));
      return withCacheHeaders(fallback);
    }

    return assetResponse;
  },
};
`;

const output = resolve("dist/server/index.js");
await mkdir(resolve("dist/server"), { recursive: true });
await writeFile(output, worker);
console.log(`Created ${output}`);
