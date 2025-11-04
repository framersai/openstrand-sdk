# @openstrand/sdk

Official TypeScript SDK for the OpenStrand API. Works in Node.js and modern browsers, ships with full type coverage, and mirrors the backend contracts generated from Prisma + Zod.

![npm version](https://img.shields.io/npm/v/@openstrand/sdk) ![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)

---

## Installation

```bash
npm install @openstrand/sdk
# or
yarn add @openstrand/sdk
# or
pnpm add @openstrand/sdk
```

---

## Quick Start

```ts
import { OpenStrandClient } from '@openstrand/sdk';

const sdk = new OpenStrandClient({
  apiUrl: process.env.OPENSTRAND_API_URL ?? 'http://localhost:8000',
});

// Authenticate (local mode)
const { token } = await sdk.auth.login({
  username: 'demo',
  password: 'Demo123!',
});

sdk.setToken(token);

// Create a strand
const strand = await sdk.strands.create({
  type: 'document',
  title: 'Knowledge Graph Notes',
  content: { markdown: '# Connections' },
  tags: ['knowledge', 'graph'],
});

console.info('strand-id', strand.id);
```

---

## Features

- **TypeSafe** – generated TypeScript definitions line up with backend validation.
- **Isomorphic** – works in Node, browsers, and serverless runtimes.
- **Configurable** – retry/backoff, custom headers, and request hooks.
- **Error-aware** – throws descriptive error classes (`AuthenticationError`, `ValidationError`, etc.).
- **Tree-shakeable** – imports only what you need.

---

## Configuration Options

```ts
const sdk = new OpenStrandClient({
  apiUrl: 'http://localhost:8000',
  token: process.env.OPENSTRAND_TOKEN, // optional
  timeout: 30_000,
  retry: {
    enabled: true,
    maxRetries: 3,
    retryDelay: 1_000,
  },
  headers: {
    'X-Client': 'openstrand-cli',
  },
});
```

`apiUrl` is required. All other fields are optional.

---

## Error Handling

```ts
import { AuthenticationError, NetworkError } from '@openstrand/sdk';

try {
  await sdk.auth.login({ username: 'demo', password: 'wrong-pass' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid credentials');
  } else if (error instanceof NetworkError) {
    console.error('Network issue:', error.cause);
  } else {
    console.error('Unexpected error', error);
  }
}
```

All API methods throw typed errors, making it easy to provide user-friendly messages.

---

## Browser Usage

```html
<script type="module">
  import { OpenStrandClient } from 'https://cdn.jsdelivr.net/npm/@openstrand/sdk/+esm';

  const sdk = new OpenStrandClient({
    apiUrl: 'https://api.openstrand.ai',
  });

  // ...
</script>
```

---

## Links

- Repository: https://github.com/framersai/openstrand
- Issues: https://github.com/framersai/openstrand/issues
- Documentation: https://github.com/framersai/openstrand/tree/main/docs

MIT © OpenStrand Contributors
