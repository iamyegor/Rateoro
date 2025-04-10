# Krijji Currency Converter

[![CI/CD Status](https://github.com/iamyegor/krijji/actions/workflows/ci-cd.yaml/badge.svg)](https://github.com/iamyegor/krijji/actions/workflows/ci-cd.yaml)
[![.NET Core](https://img.shields.io/badge/.NET-Core-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A full-stack currency and cryptocurrency conversion platform built with ASP.NET Core and React (Next.js), featuring scheduled data updates and deployment via Docker/Kubernetes.

## Key Features

*   Real-time conversion for fiat (via FlateRate) and cryptocurrencies (via CoinGecko).
*   Automated background updates: Fiat rates every 12 hours, Crypto rates every minute (using Quartz.NET).
*   Multi-language support (6 languages).
*   Light/Dark theme switching.
*   Server-Side Rendering (SSR) with Next.js for improved SEO.
*   Client-side calculation logic for cross-currency conversions.

## Tech Stack

*   **Backend:** ASP.NET Core (C#), EF Core, Quartz.NET
*   **Frontend:** React, Next.js, Tailwind CSS
*   **Database:** PostgreSQL
*   **Infrastructure & DevOps:** Docker, Kubernetes, Helm, GitHub Actions (CI/CD)
*   **APIs:** FlateRate, CoinGecko

## Architecture

*   Backend follows Clean Architecture and utilizes Domain-Driven Design (DDD) principles (e.g., Value Objects).
*   Quartz.NET manages scheduled background tasks for data fetching.
*   Applications are containerized using Docker.
*   Deployment targets a Kubernetes cluster managed via Helm charts.
*   CI/CD pipeline automated with GitHub Actions.

## Conclusion

This project demonstrates building a reliable, full-stack application with a focus on scheduled data processing, modern architecture, and automated DevOps workflows.

## Automated tests

The frontend uses the existing pnpm lockfile. Use Node.js 20 and pnpm 9:

```sh
cd krijji-client
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

`pnpm test:watch` runs Vitest interactively. The Testing Library/jsdom tests cover
conversion inputs, currency search and selection, swaps, fiat/crypto precision,
server-data prioritization and fetch failures, theme cookie persistence, and
locale redirects. Next navigation/images and browser layout APIs are stubbed;
no live currency API is required by the tests. The production build needs
network access for the application's existing Google Fonts imports.

The backend requires the .NET 9 SDK:

```sh
dotnet test krijji-server/Krijji/app/Krijji.sln
dotnet build krijji-server/Krijji/app/Krijji.sln
```

The xUnit suite covers currency/domain validation, localized converter query
mapping, the validation pipeline, controller dispatch and API error handling.
It uses an isolated EF Core InMemory context for application query behavior and
mocks unmanaged boundaries; it never starts Quartz jobs or connects to a real
database or rate provider. PostgreSQL constraints, SQL translation, full HTTP
hosting, live provider contracts, and browser layout are outside this suite.

`.github/workflows/tests.yaml` runs both suites and frontend type checking/build.
It has no publication or deployment steps; the existing deployment workflow is
unchanged. The existing `pnpm lint` script has no ESLint configuration and opens
the configuration prompt rather than completing a lint check.
