import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Medi Buddy — API Documentation</title>
    <link rel="stylesheet" href="/swagger-ui/swagger-ui.css" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
      :root {
        --primary: #6366f1;
        --primary-light: #818cf8;
        --primary-dark: #4f46e5;
        --bg: #0f172a;
        --surface: #1e293b;
        --surface-hover: #334155;
        --border: #334155;
        --text: #f8fafc;
        --text-muted: #94a3b8;
        --accent-green: #34d399;
        --accent-blue: #60a5fa;
        --accent-purple: #a78bfa;
        --shadow: 0 4px 24px rgba(0,0,0,0.3);
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
      }

      /* ─── Top navigation bar ─── */
      .api-nav {
        background: linear-gradient(135deg, var(--surface) 0%, rgba(99,102,241,0.1) 100%);
        border-bottom: 1px solid var(--border);
        padding: 0 24px;
        position: sticky;
        top: 0;
        z-index: 100;
        backdrop-filter: blur(12px);
      }

      .api-nav-inner {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 16px;
        height: 64px;
      }

      .api-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.02em;
        color: var(--text);
        text-decoration: none;
        white-space: nowrap;
      }

      .api-logo-icon {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, var(--primary) 0%, var(--accent-purple) 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
      }

      .nav-divider {
        width: 1px;
        height: 28px;
        background: var(--border);
        margin: 0 4px;
      }

      /* Step navigation pills */
      .nav-steps {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .nav-step-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin-right: 4px;
      }

      .nav-pills {
        display: flex;
        gap: 4px;
      }

      .nav-pill {
        padding: 6px 16px;
        border-radius: 20px;
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
        white-space: nowrap;
      }

      .nav-pill:hover {
        border-color: var(--primary-light);
        color: var(--text);
        background: rgba(99,102,241,0.1);
      }

      .nav-pill.active {
        background: var(--primary);
        border-color: var(--primary);
        color: white;
        box-shadow: 0 2px 8px rgba(99,102,241,0.4);
      }

      .nav-pill .pill-emoji {
        margin-right: 4px;
      }

      .step-arrow {
        color: var(--text-muted);
        font-size: 14px;
        margin: 0 4px;
        opacity: 0.5;
      }

      /* Version pills (step 2) */
      .nav-step-2 {
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .nav-step-2.visible {
        opacity: 1;
        pointer-events: auto;
      }

      .version-badge {
        display: inline-block;
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: 6px;
        vertical-align: middle;
        letter-spacing: 0.05em;
      }
      .version-badge.stable {
        background: rgba(52,211,153,0.15);
        color: var(--accent-green);
      }
      .version-badge.new {
        background: rgba(96,165,250,0.15);
        color: var(--accent-blue);
      }

      /* Info strip */
      .info-strip {
        display: none;
        align-items: center;
        gap: 8px;
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted);
      }
      .info-strip.visible { display: flex; }
      .info-strip .info-dot {
        width: 6px; height: 6px;
        border-radius: 50%;
        background: var(--accent-green);
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }


      /* ─── Swagger UI overrides for dark theme ─── */
      .swagger-ui {
        background: var(--bg) !important;
        font-family: 'Inter', sans-serif !important;
      }

      .swagger-ui .topbar { display: none !important; }

      .swagger-ui .info {
        margin: 24px 0 !important;
      }

      .swagger-ui .info .title {
        color: var(--text) !important;
        font-family: 'Inter', sans-serif !important;
      }

      .swagger-ui .info .description p,
      .swagger-ui .info .description {
        color: var(--text-muted) !important;
        font-family: 'Inter', sans-serif !important;
      }

      .swagger-ui .scheme-container {
        background: var(--surface) !important;
        border: 1px solid var(--border) !important;
        border-radius: 8px !important;
        box-shadow: none !important;
        padding: 16px !important;
      }

      .swagger-ui .opblock-tag {
        color: var(--text) !important;
        border-color: var(--border) !important;
        font-family: 'Inter', sans-serif !important;
      }

      .swagger-ui .opblock {
        border-radius: 8px !important;
        border-color: var(--border) !important;
        background: var(--surface) !important;
        box-shadow: none !important;
      }

      .swagger-ui .opblock .opblock-summary {
        border-color: var(--border) !important;
      }

      .swagger-ui .opblock .opblock-summary-description {
        color: var(--text-muted) !important;
        font-family: 'Inter', sans-serif !important;
      }

      .swagger-ui .opblock .opblock-summary-path {
        color: var(--text) !important;
      }

      .swagger-ui .opblock-body {
        background: var(--bg) !important;
      }

      .swagger-ui .opblock .opblock-section-header {
        background: var(--surface) !important;
        border-color: var(--border) !important;
      }

      .swagger-ui .opblock .opblock-section-header h4 {
        color: var(--text) !important;
      }

      .swagger-ui table thead tr th,
      .swagger-ui table thead tr td,
      .swagger-ui .parameter__name,
      .swagger-ui .parameter__type,
      .swagger-ui .response-col_status,
      .swagger-ui .response-col_description {
        color: var(--text) !important;
      }

      .swagger-ui .model-title,
      .swagger-ui .model {
        color: var(--text) !important;
      }

      .swagger-ui select {
        background: var(--surface) !important;
        color: var(--text) !important;
        border-color: var(--border) !important;
      }

      .swagger-ui input[type=text],
      .swagger-ui textarea {
        background: var(--surface) !important;
        color: var(--text) !important;
        border-color: var(--border) !important;
        border-radius: 6px !important;
      }

      .swagger-ui .btn {
        border-radius: 6px !important;
      }

      .swagger-ui .btn.authorize {
        color: var(--accent-green) !important;
        border-color: var(--accent-green) !important;
      }

      .swagger-ui .opblock.opblock-get {
        border-color: rgba(96,165,250,0.4) !important;
        background: rgba(96,165,250,0.05) !important;
      }
      .swagger-ui .opblock.opblock-get .opblock-summary {
        border-color: rgba(96,165,250,0.2) !important;
      }

      .swagger-ui .opblock.opblock-post {
        border-color: rgba(52,211,153,0.4) !important;
        background: rgba(52,211,153,0.05) !important;
      }
      .swagger-ui .opblock.opblock-post .opblock-summary {
        border-color: rgba(52,211,153,0.2) !important;
      }

      .swagger-ui .opblock.opblock-put {
        border-color: rgba(251,191,36,0.4) !important;
        background: rgba(251,191,36,0.05) !important;
      }

      .swagger-ui .opblock.opblock-delete {
        border-color: rgba(248,113,113,0.4) !important;
        background: rgba(248,113,113,0.05) !important;
      }

      .swagger-ui .opblock.opblock-patch {
        border-color: rgba(167,139,250,0.4) !important;
        background: rgba(167,139,250,0.05) !important;
      }

      .swagger-ui .model-box,
      .swagger-ui section.models {
        background: var(--surface) !important;
        border-color: var(--border) !important;
        border-radius: 8px !important;
      }

      .swagger-ui section.models h4 {
        color: var(--text) !important;
      }

      .swagger-ui .responses-inner {
        background: var(--surface) !important;
      }

      /* Loading state */
      #swagger-ui:empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
      }
      #swagger-ui:empty::after {
        content: 'Loading API documentation...';
        color: var(--text-muted);
        font-size: 14px;
        animation: fadeInOut 1.5s ease infinite;
      }
      @keyframes fadeInOut {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .api-nav-inner { flex-wrap: wrap; height: auto; padding: 12px 0; gap: 8px; }
        .nav-divider { display: none; }
        .nav-pills { flex-wrap: wrap; }
        .info-strip { display: none !important; }
      }
    </style>
  </head>
  <body>

    <!-- Top navigation -->
    <nav class="api-nav">
      <div class="api-nav-inner">
        <a class="api-logo" href="/api-doc">
          <span class="api-logo-icon">💊</span>
          Medi Buddy API
        </a>

        <span class="nav-divider"></span>

        <!-- Step 1: Client type -->
        <div class="nav-steps">
          <span class="nav-step-label">client</span>
          <div class="nav-pills" id="clientPills">
            <button class="nav-pill" data-client="mobile" onclick="selectClient('mobile')">
              <span class="pill-emoji">📱</span> Mobile
            </button>
            <button class="nav-pill" data-client="admin" onclick="selectClient('admin')">
              <span class="pill-emoji">🖥️</span> Admin
            </button>
          </div>
        </div>

        <span class="step-arrow" id="arrow1">›</span>

        <!-- Step 2: Version -->
        <div class="nav-steps nav-step-2" id="versionStep">
          <span class="nav-step-label">version</span>
          <div class="nav-pills" id="versionPills">
            <!-- filled dynamically -->
          </div>
        </div>

        <!-- Info strip -->
        <div class="info-strip" id="infoStrip">
          <span class="info-dot"></span>
          <span id="infoText">—</span>
        </div>
      </div>
    </nav>

    <div id="swagger-ui"></div>

    <script src="/swagger-ui/swagger-ui-bundle.js"></script>
    <script src="/swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script>
      // ── Spec catalog ──
      const catalog = {
        mobile: [
          { id: 'mobile-v1', label: 'v1', badge: 'STABLE', badgeClass: 'stable', info: '37 endpoints' },
          { id: 'mobile-v2', label: 'v2', badge: 'NEW',    badgeClass: 'new',    info: '5 endpoints'  },
        ],
        admin: [
          { id: 'admin-v1', label: 'v1', badge: 'STABLE', badgeClass: 'stable', info: '14 endpoints' },
        ],
      };

      // ── Shared Auth Plugin ──
      // Persists the bearer token across spec changes using localStorage
      const SharedAuthPlugin = function(system) {
        return {
          statePlugins: {
            auth: {
              wrapActions: {
                authorize: (oriAction) => (payload) => {
                  try {
                    // payload key matches securityScheme name 'bearerAuth'
                    if (payload.bearerAuth && payload.bearerAuth.value) {
                      localStorage.setItem('MEDIBUDDY_TOKEN', payload.bearerAuth.value);
                    }
                  } catch(e) { console.error('Auth save error', e); }
                  return oriAction(payload);
                },
                logout: (oriAction) => (payload) => {
                  try {
                    localStorage.removeItem('MEDIBUDDY_TOKEN');
                  } catch(e) {}
                  return oriAction(payload);
                }
              }
            }
          }
        }
      };

      let currentUI = null;

      function loadSpec(specId) {
        if (currentUI) {
          // Destroy the old instance
          const container = document.getElementById('swagger-ui');
          container.innerHTML = '';
        }

        currentUI = SwaggerUIBundle({
          url: '/api/openapi?spec=' + specId,
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset,
          ],
          plugins: [
            SharedAuthPlugin
          ],
          layout: 'StandaloneLayout',
          deepLinking: true,
          defaultModelsExpandDepth: -1,
          docExpansion: 'list',
          persistAuthorization: true, 
          onComplete: () => {
            // Restore token from localStorage if exists
            try {
              const token = localStorage.getItem('MEDIBUDDY_TOKEN');
              if (token) {
                // Must match the security scheme in openapi.json
                currentUI.authActions.authorize({
                  bearerAuth: {
                    name: "bearerAuth",
                    schema: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
                    value: token
                  }
                });
              }
            } catch (e) { console.error('Auth restore error', e); }
          }
        });

        // Save to URL hash for bookmarking
        window.location.hash = specId;
      }

      function selectClient(client) {
        // Highlight client pill
        document.querySelectorAll('#clientPills .nav-pill').forEach(p => {
          p.classList.toggle('active', p.dataset.client === client);
        });

        // Build version pills
        const versions = catalog[client] || [];
        const container = document.getElementById('versionPills');
        container.innerHTML = '';

        versions.forEach((v, i) => {
          const btn = document.createElement('button');
          btn.className = 'nav-pill';
          btn.dataset.specid = v.id;
          btn.innerHTML = v.label + '<span class="version-badge ' + v.badgeClass + '">' + v.badge + '</span>';
          btn.onclick = () => selectVersion(v);
          container.appendChild(btn);
        });

        // Show version step
        document.getElementById('versionStep').classList.add('visible');

        // Auto-select the first version
        if (versions.length > 0) {
          selectVersion(versions[0]);
        }
      }

      function selectVersion(version) {
        // Highlight version pill
        document.querySelectorAll('#versionPills .nav-pill').forEach(p => {
          p.classList.toggle('active', p.dataset.specid === version.id);
        });

        // Update info strip
        const strip = document.getElementById('infoStrip');
        strip.classList.add('visible');
        document.getElementById('infoText').textContent = version.info;

        // Load the spec
        loadSpec(version.id);
      }

      // ── Init: restore from URL hash or default ──
      window.onload = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash && (hash.startsWith('mobile') || hash.startsWith('admin'))) {
          const client = hash.startsWith('admin') ? 'admin' : 'mobile';
          selectClient(client);
          const versions = catalog[client];
          const target = versions.find(v => v.id === hash);
          if (target) selectVersion(target);
        } else {
          // Default: show mobile v1
          selectClient('mobile');
        }
      };
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
    },
  });
}
