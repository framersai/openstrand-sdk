# OpenStrand SDK (local mirror)

This folder provides local-developer conveniences for consuming the public `wearetheframers/openstrand-sdk` repository.

- In production the SDK lives in its own repository and publishes Python (`openstrand-sdk`) and TypeScript (`@openstrand/sdk`) packages.
- Inside this monorepo we track the SDK as a vendored dependency (submodule or periodically synced copy) so the OSS app can import shared models without additional checkouts.

## Usage

1. Run `git submodule update --init --recursive packages/openstrand-sdk` (once the submodule is configured).
2. Install the Python package in editable mode for local work:
   ```bash
   cd packages/openstrand-sdk
   uv pip install -e .
   ```
3. For TypeScript types, consume `@openstrand/sdk` via npm (published from the upstream repo).

During the transition we expose thin re-export shims so existing imports (`from openstrand_sdk.models import Strand`) continue to work. These will be replaced by the true SDK once the external repository is published.
