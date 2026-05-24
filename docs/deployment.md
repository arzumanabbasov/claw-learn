# Deployment Guide

## Vercel (recommended)

Vercel is the simplest deployment target for Next.js. The repo includes a pre-configured `vercel.json`.

### First deploy

```bash
# Install Vercel CLI
npm install -g vercel

# From the thinkinmotion directory
vercel
```

Follow the prompts. Vercel will detect Next.js automatically.

### Environment variables

After the first deploy, go to your project in the [Vercel dashboard](https://vercel.com/dashboard) → **Settings → Environment Variables** and add:

| Variable | Environment | Required | Value |
|---|---|---|---|
| `GEMINI_API_KEY` | Production, Preview | ✅ | Your Google AI Studio key |
| `ELEVENLABS_API_KEY` | Production, Preview | Optional | Your ElevenLabs key |
| `ELEVENLABS_VOICE_ID` | Production, Preview | Optional | Voice ID (default: Adam) |
| `ELEVENLABS_SPEECH_ENGINE_ID` | Production, Preview | Optional | Conversational AI agent ID |
| `ALLOWED_ORIGIN` | Production | Recommended | `https://your-domain.vercel.app` |

Then redeploy:

```bash
vercel --prod
```

### Subsequent deploys

```bash
vercel --prod
```

Or connect your GitHub repo in the Vercel dashboard for automatic deploys on push to `main`.

---

## Self-hosted (Node.js)

### Build

```bash
npm run build
```

### Run

```bash
npm start
```

The app listens on port 3000 by default. Set `PORT` to override.

### Environment variables

Create a `.env.local` file (or set system environment variables):

```env
GEMINI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_SPEECH_ENGINE_ID=agent_xxxx
ALLOWED_ORIGIN=https://your-domain.com
NODE_ENV=production
```

### Reverse proxy (nginx example)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Enable standalone output in `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... rest of config
};
```

Build and run:

```bash
docker build -t thinkinmotion .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your_key \
  -e ELEVENLABS_API_KEY=your_key \
  thinkinmotion
```

---

## Production checklist

- [ ] `GEMINI_API_KEY` is set
- [ ] `ALLOWED_ORIGIN` is set to your production domain
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is configured (required for microphone access)
- [ ] Vercel secrets are named correctly (see `vercel.json`)
- [ ] ElevenLabs usage limits are monitored (free tier: 10k chars/month)
- [ ] Gemini API quota is monitored in Google AI Studio

---

## Monitoring

### Logs

On Vercel: **Dashboard → Project → Functions → View logs**

On self-hosted: stdout/stderr from `npm start`. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start npm --name thinkinmotion -- start
pm2 logs thinkinmotion
```

### What to watch for

- `Explain API error:` — Gemini failures (quota, model name, malformed JSON)
- `ElevenLabs TTS error:` — TTS failures (quota, invalid voice ID)
- `Speech Engine token error:` — WebRTC token failures
- `[SpeechEngine]` — client-side Speech Engine errors (check browser console)
