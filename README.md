This is an example app demonstrating how to build a dashboard that monitors feature usage across your customer base and triggers webhook notifications when customers are reaching usage limits. We'll use Next.js, Schematic's API to retrieve allocation and usage data for individual features, and webhook notifications for alerting.

## Prerequisites

In order to follow this tutorial, you'll need:
1. Node.js 18 or higher installed
2. A Schematic account
3. A webhook endpoint for receiving notifications (optional)

## Getting Started

1. Set up your Schematic account with metered features you'd like to track

2. Set up your `.env` file:

```bash
cp .env.example .env
```

3. In the [Schematic account](https://app.schematichq.com), create a new API key and store the secret in your `.env` file:

```bash
NEXT_PUBLIC_SCHEMATIC_API_KEY=''
```

4. Install dependencies:

```bash
npm install
# or
yarn
# or
pnpm install
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

7. Add a Feature ID from Schematic and press Load to retrieve data.