import { NextResponse } from "next/server";

// Simple Swagger UI page served at /api-doc using CDN assets.
export async function GET() {
  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API Docs | Final Project Backend</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      /* Force light theme and clean layout */
      :root { color-scheme: light; }
      body { margin: 0; background: #ffffff; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
      .topbar { display: none; }
      #page { max-width: 1200px; margin: 0 auto; padding: 16px; }
      #swagger-ui { max-width: 1200px; margin: 0 auto; }

      /* Simple page header */
      .docs-header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 12px; }
      .docs-title { font-size: 20px; font-weight: 600; margin-right: auto; }
      .docs-sub { color: #666; font-size: 12px; }

      /* Quick filters + auth */
      .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .btn { appearance: none; border: 1px solid #ddd; background: #f7f7f7; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
      .btn.active { background: #e9f2ff; border-color: #98c3ff; }
      .btn:hover { background: #efefef; }
      .token-input { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #ddd; border-radius: 6px; padding: 4px 6px; }
      .token-input input { border: none; outline: none; font-size: 12px; min-width: 240px; }

      /* Hide Models section and response examples for cleaner reading */
      .models { display: none !important; }
      /* Keep request editor visible; only hide response examples */
      .responses-table .response-col_description .example { display: none !important; }
      .responses-wrapper .model-example { display: none !important; }
      .responses-wrapper .examples-select { display: none !important; }
    </style>
  </head>
  <body>
    <div id="page">
      <div class="docs-header">
        <div class="docs-title">API Docs</div>
        <div class="controls" role="group" aria-label="Quick filters">
          <button id="filter-all" class="btn filter-btn active" title="Show all endpoints">All</button>
          <button id="filter-mobile" class="btn filter-btn" title="Show Mobile endpoints only">Mobile</button>
          <button id="filter-admin" class="btn filter-btn" title="Show Admin endpoints only">Admin</button>
          <span class="docs-sub">Use quick filter or search. Paste a token to authorize.</span>
          <span class="token-input" title="Paste access token to authorize requests">
            <input id="auth-token" type="text" placeholder="Bearer eyJhbGci... or just the token" />
            <button id="auth-apply" class="btn">Authorize</button>
            <button id="auth-clear" class="btn" title="Clear token">Clear</button>
          </span>
        </div>
      </div>
      <div id="swagger-ui"></div>
    </div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        const STORAGE_KEY = 'swagger_bearer_token';
        const ui = SwaggerUIBundle({
          url: '/api/openapi',
          dom_id: '#swagger-ui',
          deepLinking: true,
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset
          ],
          layout: 'StandaloneLayout',
          docExpansion: 'list',
          displayRequestDuration: true,
          defaultModelRendering: 'schema',
          defaultModelsExpandDepth: -1,
          filter: true,
          persistAuthorization: true,
          tagsSorter: 'alpha',
          operationsSorter: 'alpha'
        });
        window.ui = ui;

        // Helper: set filter text in the built-in filter box
        function setFilter(text) {
          const filterInput = document.querySelector('#swagger-ui .filter input[type="text"]');
          if (!filterInput) return;
          filterInput.value = text;
          const evt = new Event('input', { bubbles: true });
          filterInput.dispatchEvent(evt);
        }

        // Quick filter buttons
        function setActive(btn) {
          document.querySelectorAll('.controls .filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
        document.getElementById('filter-all').addEventListener('click', (e) => { setActive(e.currentTarget); setFilter(''); });
        document.getElementById('filter-mobile').addEventListener('click', (e) => { setActive(e.currentTarget); setFilter('Mobile -'); });
        document.getElementById('filter-admin').addEventListener('click', (e) => { setActive(e.currentTarget); setFilter('Admin -'); });

        // Quick bearer auth
        const tokenInput = document.getElementById('auth-token');
        // restore token after refresh
        try {
          const saved = (localStorage.getItem(STORAGE_KEY) || '').trim();
          if (saved) {
            tokenInput.value = saved;
            const value = saved.startsWith('Bearer ') ? saved : 'Bearer ' + saved;
            ui.preauthorizeApiKey('bearerAuth', value);
          }
        } catch (e) { console.warn('Token restore failed', e); }

        document.getElementById('auth-apply').addEventListener('click', () => {
          const raw = (tokenInput.value || '').trim();
          if (!raw) return;
          const value = raw.startsWith('Bearer ') ? raw : 'Bearer ' + raw;
          try { ui.preauthorizeApiKey('bearerAuth', value); } catch (e) { console.warn('Preauthorize failed', e); }
          try { localStorage.setItem(STORAGE_KEY, raw); } catch (e) { console.warn('Token save failed', e); }
        });
        document.getElementById('auth-clear').addEventListener('click', () => {
          tokenInput.value = '';
          try { if (ui && ui.authActions) ui.authActions.logout(); } catch (e) { console.warn('Logout failed', e); }
          try { localStorage.removeItem(STORAGE_KEY); } catch (e) { console.warn('Token clear failed', e); }
        });
      };
    </script>
  </body>
  </html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store'
    }
  });
}
