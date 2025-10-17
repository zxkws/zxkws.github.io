# Config Center

Configuration center for micro-frontend applications.

## Purpose

This micro-app serves static JSON configuration files that define:

- Micro-app registration details
- Menu configurations
- Permissions and routing

## Files

- `public/micro-apps.json` - Main configuration file for all micro-apps

## Development

```bash
pnpm dev
```

Runs on `http://localhost:5175`

## Production

Configuration is served at `/config-center/micro-apps.json`
