#!/usr/bin/env node
/**
 * split-openapi.cjs
 *
 * Reads public/openapi.json and splits it into:
 *   public/specs/admin-v1.json
 *   public/specs/mobile-v1.json
 *   public/specs/mobile-v2.json
 *
 * Each spec contains only the paths, tags, and schemas relevant to that group.
 * The original openapi.json is kept as-is (not modified).
 */

const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "..", "public", "openapi.json");
const OUT_DIR = path.join(__dirname, "..", "public", "specs");

const spec = JSON.parse(fs.readFileSync(SOURCE, "utf-8"));

// ── helpers ──────────────────────────────────────────────────────────

/** Collect every $ref string inside an object tree */
function collectRefs(obj, refs = new Set()) {
    if (!obj || typeof obj !== "object") return refs;
    if (typeof obj.$ref === "string") {
        refs.add(obj.$ref);
    }
    for (const v of Object.values(obj)) {
        collectRefs(v, refs);
    }
    return refs;
}

/** Resolve transitive schema refs (schemas that reference other schemas) */
function resolveAllSchemas(rootRefs, allSchemas) {
    const resolved = new Set();
    const queue = [...rootRefs];
    while (queue.length) {
        const ref = queue.pop();
        if (resolved.has(ref)) continue;
        resolved.add(ref);
        const name = ref.replace("#/components/schemas/", "");
        const schema = allSchemas[name];
        if (schema) {
            for (const childRef of collectRefs(schema)) {
                if (!resolved.has(childRef)) queue.push(childRef);
            }
        }
    }
    return resolved;
}

// ── define groups ────────────────────────────────────────────────────

const groups = [
    {
        id: "admin-v1",
        title: "🖥️ Admin API v1",
        description: "Admin dashboard & management endpoints (v1).",
        pathPrefix: "/api/admin/v1/",
    },
    {
        id: "mobile-v1",
        title: "📱 Mobile API v1",
        description: "Mobile client endpoints (v1).",
        pathPrefix: "/api/mobile/v1/",
    },
    {
        id: "mobile-v2",
        title: "📱 Mobile API v2",
        description: "Mobile client endpoints (v2). Newer versions of existing v1 endpoints with enhanced features.",
        pathPrefix: "/api/mobile/v2/",
    },
];

// ── split ────────────────────────────────────────────────────────────

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const g of groups) {
    // 1. Filter paths
    const paths = {};
    const usedTagNames = new Set();

    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
        if (pathKey.startsWith(g.pathPrefix)) {
            paths[pathKey] = pathItem;
            // Collect tags used by operations in this path
            for (const method of Object.values(pathItem)) {
                if (method.tags) method.tags.forEach((t) => usedTagNames.add(t));
            }
        }
    }

    // 2. Build tags list — include defined tags that are used, plus auto-create
    //    entries for tags used in paths but missing from the top-level tags array
    const definedTagMap = new Map((spec.tags || []).map((t) => [t.name, t]));
    const tags = [];
    for (const tagName of usedTagNames) {
        if (definedTagMap.has(tagName)) {
            tags.push(definedTagMap.get(tagName));
        } else {
            // Tag used in paths but not defined at top-level — create it
            tags.push({ name: tagName, description: tagName });
        }
    }
    // Sort tags alphabetically for consistency
    tags.sort((a, b) => a.name.localeCompare(b.name));

    // 3. Determine which schemas are referenced
    const directRefs = collectRefs(paths);
    const allRefs = resolveAllSchemas(directRefs, spec.components?.schemas || {});
    const schemas = {};
    for (const ref of allRefs) {
        const name = ref.replace("#/components/schemas/", "");
        if (spec.components?.schemas?.[name]) {
            schemas[name] = spec.components.schemas[name];
        }
    }

    // 4. Build the new spec
    const newSpec = {
        openapi: spec.openapi,
        info: {
            title: g.title,
            version: spec.info.version,
            description: g.description,
        },
        servers: spec.servers,
        tags,
        components: {
            securitySchemes: spec.components?.securitySchemes || {},
            schemas,
        },
        paths,
    };

    // 5. Write
    const outPath = path.join(OUT_DIR, `${g.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(newSpec, null, 2) + "\n");

    const pathCount = Object.keys(paths).length;
    const schemaCount = Object.keys(schemas).length;
    console.log(`✅ ${g.id}.json  →  ${pathCount} paths, ${schemaCount} schemas, ${tags.length} tags`);
}

console.log("\nDone! Files written to public/specs/");
