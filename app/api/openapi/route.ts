import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * GET /api/openapi?spec=admin-v1 | mobile-v1 | mobile-v2
 *
 * Serves the requested split OpenAPI spec from public/specs/.
 * Falls back to the full spec (public/openapi.json) when no query param is given.
 */
const VALID_SPECS = new Set(["admin-v1", "admin-v2", "mobile-v1", "mobile-v2", "auth-v2"]);

export async function GET(req: NextRequest) {
  try {
    const specParam = req.nextUrl.searchParams.get("spec");

    let filePath: string;
    if (specParam && VALID_SPECS.has(specParam)) {
      filePath = join(process.cwd(), "public", "specs", `${specParam}.json`);
    } else {
      // fallback: serve the full monolith spec
      filePath = join(process.cwd(), "public", "openapi.json");
    }

    const fileContents = await readFile(filePath, "utf-8");
    const openApiSpec = JSON.parse(fileContents);

    return NextResponse.json(openApiSpec, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=UTF-8",
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