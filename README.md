# AI Blog Post Outline Generator

A Cloudflare Worker that generates blog post outlines using Workers AI (Llama 3.2 3B).

## Features

- Three outline depths: brief, standard, detailed
- Four tones: professional, conversational, technical, beginner-friendly
- Optional target keywords and audience
- Auto-generated SEO meta description
- Runs on Cloudflare Workers AI — no API keys
- Built-in rate limiting (30 requests/min per IP)
- Text is not stored or logged
- Multi-language interface (EN + ZH)

## Setup

```bash
npm install
npx wrangler login
npx wrangler deploy
```

## Routes

Add to `tool-proxy`:
- `toolara.dev/ai-blog-outline-generator/*`
- `www.toolara.dev/ai-blog-outline-generator/*`

## License

MIT
