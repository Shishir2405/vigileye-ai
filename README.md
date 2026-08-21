# VigilEye AI

Three folders, one command.

```
website/     Next.js dashboard   (port 3000)
backend/     NestJS API          (port 8000, GraphQL at /graphql, REST at /api)
ml-model/    FastAPI inference   (port 9000)
```

## First-time setup

```bash
npm install                # installs concurrently in the root
npm run install:all        # installs website + backend node_modules, ml-model service deps
```

## Run everything

```bash
npm run dev
```

This prints a banner of every route (website pages, GraphQL playground, REST endpoints, ML API docs) then starts all three at once with `concurrently`, each line in the terminal prefixed and color-coded by folder (`website` blue, `backend` green, `ml-model` yellow) so you can see which folder logged what.

Run one at a time instead with `npm run dev:website`, `npm run dev:backend`, or `npm run dev:ml`.

See each folder's own README for details: [website](website), [backend](backend/README.md), [ml-model](ml-model/README.md).

## Training data

`ml-model/datasets/` ships with a real starter crack dataset (118 labeled road-crack photos, ~11MB, already downloaded and converted — not a placeholder). See [ml-model/datasets/README.md](ml-model/datasets/README.md).
