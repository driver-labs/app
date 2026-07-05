# Scenario definitions

Each scenario lives in `scenarios/NN-slug.json` so a single practice can be edited without touching the full catalog.

- Keep the numeric prefix to preserve the practice order.
- Add new scenario files to `index.ts` so Next can bundle them statically.
- `core/scenarios/index.ts` validates every file with `ScenarioDefinitionSchema` at import time.
