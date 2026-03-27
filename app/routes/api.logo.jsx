import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const loader = async () => {
  try {
    const filePath = resolve(process.cwd(), "new-logo.png");
    const fileBuffer = await readFile(filePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (_err) {
    return new Response("Logo not found", { status: 404 });
  }
};

