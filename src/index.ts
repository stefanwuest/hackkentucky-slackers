import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.html(`
    <html>
      <head>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            background: #f5f5f5;
            color: #1a1a2e;
          }

          /* --- Floating header bar --- */
          .header-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2rem;
            padding: 0.85rem 1.5rem;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border-bottom: 1px solid rgba(26, 26, 46, 0.08);
            box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
          }

          .header-titles {
            display: flex;
            flex-direction: column;
            line-height: 1.15;
          }

          .header-titles h1 {
            font-size: 1.35rem;
            font-weight: 700;
            color: #1a1a2e;
            margin: 0;
            text-align: left;
          }

          .header-titles h2 {
            font-size: 0.85rem;
            font-weight: 400;
            color: #3f3755;
            margin: 0.15rem 0 0;
            text-align: left;
          }

          .search-wrap {
            flex: 0 1 340px;
          }

          .search-input {
            width: 100%;
            padding: 0.55rem 0.9rem;
            border: 1px solid rgba(26, 26, 46, 0.15);
            border-radius: 6px;
            font-size: 0.9rem;
            color: #1a1a2e;
            background: #ffffff;
            outline: none;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }

          .search-input::placeholder {
            color: #8b8698;
          }

          .search-input:focus {
            border-color: #c17817;
            box-shadow: 0 0 0 3px rgba(193, 120, 23, 0.15);
          }

          /* --- Placeholder report area, so you can see the float in action --- */
          .report-area {
            padding: 2rem 1.5rem;
            max-width: 900px;
          }

          .report-area p {
            color: #3f3755;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="header-titles">
            <h1>Zywave Prospect Intelligence!</h1>
            <h2>Your reason to call...</h2>
          </div>
          <div class="search-wrap">
            <input class="search-input" type="text" placeholder="Search accounts, contacts, or reports..." />
          </div>
        </div>

        <div class="report-area">
          <p>Report content will load here. Scroll to see the header stay fixed at the top.</p>
        </div>
      </body>
    </html>
  `)
})

export default app