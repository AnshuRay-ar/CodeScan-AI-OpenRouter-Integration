# CodeScan AI — OpenRouter setup

## Files
- `public/script.js`: replacement frontend JavaScript. Keep your existing HTML and CSS in `public/`.
- `server.js`: Node.js backend. Holds the OpenRouter API key securely.

## 1. Folder layout

```text
codescan-ai/
  public/
    index.html
    style.css
    script.js
  server.js
  .env
  .gitignore
  package.json
```

Move your existing frontend files into `public/` if they are not there already. Make sure the HTML loads the replacement `script.js`.

## 2. Install dependencies

```bash
npm init -y
npm install express dotenv
```

Node.js 18 or newer is recommended because this backend uses built-in `fetch`.

## 3. Create `.env`

```env
OPENROUTER_API_KEY=your_actual_openrouter_key
PORT=3000
APP_URL=http://localhost:3000
```

Do not put quotes around the key. Never commit `.env` or expose the key in frontend code.

## 4. Create `.gitignore`

```gitignore
node_modules/
.env
```

## 5. Start

```bash
node server.js
```

Open `http://localhost:3000`. Do not open `index.html` directly with `file://`, because the frontend calls `/api/analyze` on the backend.

## Notes
- The model configured is `cohere/north-mini-code:free`.
- OpenRouter free model availability, rate limits, and provider capacity can change. A `429` or provider availability error may mean you need to wait or select another currently free model.
- The existing HTML must include the element IDs referenced by `script.js`, and the `marked` library must already be loaded as in your original project.
- For production deployment, configure `OPENROUTER_API_KEY` as a server-side environment variable in your hosting provider. Use HTTPS and restrict request size/rate to protect your endpoint.
