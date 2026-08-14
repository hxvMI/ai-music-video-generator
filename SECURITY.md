# Security Policy

## Reporting a Vulnerability

Please do not publish API keys, access tokens, private media, or detailed
exploit instructions in a public issue. Contact the repository owner privately
through GitHub before opening a public report.

Include the affected route or component, reproduction conditions, and the
potential impact. Remove credentials and personal media from logs or examples.

## Credential Handling

- Server credentials belong in `.env.local` during development and in the
  hosting provider's encrypted environment settings when deployed.
- Personal credentials entered through the interface remain session-only and
  must not be added to project persistence, render manifests, or exports.
- Never add a `NEXT_PUBLIC_` prefix to a secret.
- If a credential enters Git history, revoke it first, then remove it from all
  affected refs. Deleting it only from the latest file is not sufficient.
