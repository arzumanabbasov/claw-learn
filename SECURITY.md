# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `main` branch | ✅ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email: me@arzuman.co *(or open a private GitHub Security Advisory)*

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

We will acknowledge your report within 48 hours and aim to release a fix within 7 days for critical issues.

## Security Model

### API keys

All API keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_SPEECH_ENGINE_ID`) are server-side environment variables. They are never included in the client bundle or returned in any API response.

### Input validation

Every API route validates and sanitizes its inputs:

| Route | Limits |
|---|---|
| `POST /api/explain` | Question ≤ 500 chars, history ≤ 10 items × 300 chars, roles allowlisted |
| `POST /api/narrate` | Text ≤ 500 chars, voice ID is server-controlled |
| `GET /api/speech-engine/token` | No user input; returns short-lived WebRTC token |

### CORS

In production, set `ALLOWED_ORIGIN` to your domain. The default (unset) emits no CORS header, meaning only same-origin requests are accepted.

### Math expression evaluation

The canvas renderer evaluates math function strings from Gemini's JSON output using a custom recursive-descent parser — not `eval` or `new Function`. Only a strict allowlist of tokens is accepted: numbers, the variable `x`, arithmetic operators, parentheses, and `Math.sin/cos/tan/sqrt/exp/log/abs`. Any other token causes the expression to return `0`.

### Response headers

All responses include:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), geolocation=(), microphone=(self)
```

### Error messages

Internal error details (upstream API responses, stack traces) are logged server-side only. Clients receive generic error messages.
