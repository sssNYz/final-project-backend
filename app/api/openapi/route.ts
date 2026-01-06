import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "openapi.json");
    const fileContents = await readFile(filePath, "utf-8");
    const openApiSpec = JSON.parse(fileContents);

    return NextResponse.json(openApiSpec, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=UTF-8",
        // Don't cache: Swagger UI should always load latest spec after edits
        "cache-control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error serving OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Failed to load OpenAPI specification" },
      { status: 500 }
    );
  }
}