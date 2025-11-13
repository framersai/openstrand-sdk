# @framers/openstrand-sdk

<p align="center">
  <a href="https://github.com/framersai/openstrand-monorepo">
    <img alt="OpenStrand" height="72" src="./assets/openstrand-logo.svg">
  </a>
</p>

<p align="center">
  Official TypeScript SDK for the OpenStrand API. Works in Node.js and modern browsers, ships with full type coverage, and mirrors backend contracts.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@framers/openstrand-sdk">
    <img src="https://img.shields.io/npm/v/@framers/openstrand-sdk?style=flat-square&logo=npm&color=%23CB3837" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@framers/openstrand-sdk">
    <img src="https://img.shields.io/npm/dm/@framers/openstrand-sdk?style=flat-square&logo=npm&color=%23CB3837" alt="npm downloads" />
  </a>
  <a href="https://github.com/framersai/openstrand-monorepo/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/framersai/openstrand-monorepo/test.yml?style=flat-square&logo=github&label=tests" alt="Tests" />
  </a>
  <a href="https://github.com/framersai/openstrand-monorepo/blob/master/packages/openstrand-sdk/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square" alt="License: MIT" />
  </a>
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18-green?style=flat-square&logo=node.js" alt="Node.js" />
  <a href="https://bundlephobia.com/package/@framers/openstrand-sdk">
    <img src="https://img.shields.io/bundlephobia/minzip/@framers/openstrand-sdk?style=flat-square&label=bundle%20size" alt="Bundle size" />
  </a>
  <a href="https://github.com/framersai/openstrand-monorepo">
    <img src="https://img.shields.io/github/stars/framersai/openstrand-monorepo?style=flat-square&logo=github" alt="GitHub stars" />
  </a>
</p>

---

## Installation

```bash
npm install @framers/openstrand-sdk
# or
yarn add @framers/openstrand-sdk
# or
pnpm add @framers/openstrand-sdk
```

---

## Quick Start

```ts
import { OpenStrandSDK } from '@framers/openstrand-sdk';

const sdk = new OpenStrandSDK({
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

## Visualizations

Create, list, update, delete, export, and inspect tier availability.

```ts
import { OpenStrandSDK } from '@framers/openstrand-sdk';

const sdk = new OpenStrandSDK({ apiUrl: 'http://localhost:8000' });

// Create from a prompt (optionally attach a datasetId and tier)
const viz = await sdk.visualizations.create({
  prompt: 'Bar chart of revenue by month',
  datasetId: 'ds_123',
  tier: 1,
});

// Paginate list
const { items } = await sdk.visualizations.list({ page: 1, pageSize: 20 });

// Update
const updated = await sdk.visualizations.update(viz.id, { options: { color: 'teal' } });

// Export (Blob)
const svg = await sdk.visualizations.export(viz.id, 'svg');

// Delete
await sdk.visualizations.delete(viz.id);

// Tier info
const tiers = await sdk.visualizations.tierInfo();
```

---

## Data & Feedback

```ts
// Upload a dataset
const { datasetId, metadata } = await sdk.data.upload(file);

// Summary and preview
const summary = await sdk.data.summary(datasetId);
const preview = await sdk.data.preview(datasetId, 20);

// Schema intelligence
const schema = await sdk.data.schema(datasetId);

// Prompt a visualization for the dataset
const viz = await sdk.data.visualize(datasetId, 'Line chart of sales by day');

// Feedback
await sdk.feedback.upvote(viz.id);
const fb = await sdk.feedback.summary(viz.id);
```

---

## Meta, Featured, Teams & Domains, Weave Advanced

```ts
// Meta and docs links
const meta = await sdk.meta.developer();

// Featured/leaderboard
const featured = await sdk.featured.list();
const leaderboard = await sdk.featured.leaderboard({ period: 'week', limit: 10 });

// Team API tokens (Team+)
const tokens = await sdk.teams.tokens.list();

// Custom domains (Team+)
await sdk.teams.domains.add({ teamId: 't_123', domain: 'example.com' });

// Weave (graph) advanced
const segment = await sdk.weaveAdvanced.graph('weave_123', { cluster: true, limit: 200 });
const paths = await sdk.weaveAdvanced.findPaths('weave_123', 'nodeA', 'nodeB', 4);
```

---

## Configuration Options

```ts
const sdk = new OpenStrandSDK({
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
import { AuthenticationError, NetworkError } from '@framers/openstrand-sdk';

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
  import { OpenStrandSDK } from 'https://cdn.jsdelivr.net/npm/@framers/openstrand-sdk/+esm';

  const sdk = new OpenStrandClient({
    apiUrl: 'https://api.openstrand.ai',
  });

  // ...
</script>
```

---

## API Docs (TypeDoc)

Generate HTML docs from TSDoc comments:

```bash
npm install
npm run docs
# output: packages/openstrand-sdk/docs/
```

---

## Links

- Repository: https://github.com/framersai/openstrand-monorepo
- Issues: https://github.com/framersai/openstrand-monorepo/issues
- Documentation: https://github.com/framersai/openstrand-monorepo/tree/master/docs

---

<p align="center">
  <strong>Built by</strong><br/>
  <a href="https://frame.dev">
    <img src="./assets/frame-dev.svg" alt="Frame.dev" height="32" />
  </a>
</p>

<p align="center">
  MIT © 2025 <a href="https://frame.dev">Framers</a>
</p>
