# Paperclip

Paperclip is the command center for building an autonomous company with AI agents.

This repository is prepared for Coolify autodeploy from GitHub. The app is a React + Vite frontend served by Nginx from a Docker image.

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Coolify

Use these settings when creating the application:

- Source: `https://github.com/Wroblewski-Patryk/paperclip`
- Build pack: Dockerfile
- Port: `80`
- Health check path: `/health`
- Domain: `paperclip.luckysparrow.ch`

After the app is live in Coolify, move the DNS record for `paperclip.luckysparrow.ch` from the old VPS target to the Coolify proxy target.
