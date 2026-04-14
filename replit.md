# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Applications

### Vintage Garage (`artifacts/vintage-garage`)

A personal maintenance logbook dashboard for classic cars and motorcycles.

**Features:**
- Add/edit/delete vehicles (cars and motorcycles) with color, mileage, registration number, Finn.no link
- Log service records per vehicle (oil change, brakes, tires, engine, electrical, bodywork, other categories)
- Add/delete receipts linked to vehicles or service records
- Dashboard with overall stats, category breakdown, and recent activity feed
- Vehicle detail page with full service history timeline

**Stack:** React + Vite + Tailwind + shadcn/ui + React Query + wouter

**Routes:**
- `/` — Dashboard
- `/vehicles` — Vehicle list (My Garage)
- `/vehicles/new` — Add vehicle
- `/vehicles/:id` — Vehicle detail with service history and receipts
- `/vehicles/:id/edit` — Edit vehicle
- `/vehicles/:id/service/new` — Add service record
- `/vehicles/:id/service/:serviceId/edit` — Edit service record
- `/vehicles/:id/receipts/new` — Add receipt

### API Server (`artifacts/api-server`)

Express 5 REST API serving the Vintage Garage frontend.

**Endpoints:**
- `GET/POST /api/vehicles`
- `GET/PATCH/DELETE /api/vehicles/:id`
- `GET/POST /api/vehicles/:vehicleId/service-records`
- `GET/PATCH/DELETE /api/vehicles/:vehicleId/service-records/:id`
- `GET/POST /api/vehicles/:vehicleId/receipts`
- `DELETE /api/vehicles/:vehicleId/receipts/:id`
- `GET /api/stats/dashboard` — summary stats
- `GET /api/stats/recent-activity` — recent service feed

## Database Schema

- `vehicles` — make, model, year, type, registrationNumber, color, mileage, finnUrl, notes, imageUrl
- `service_records` — vehicleId, title, description, serviceDate, mileageAtService, cost, performedBy, category
- `receipts` — vehicleId, serviceRecordId, title, amount, receiptDate, vendor, fileUrl, notes

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
