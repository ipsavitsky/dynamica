# Dynamica Market DApp

**Contracts repository**: https://github.com/Zhenyazhd/dynamica_contracts

A decentralized prediction market application built with SvelteKit, enabling users to trade on continuous values, like racing driver performance and cryptocurrency prices using an automated market maker (AMM) mechanism.

## 🛠 Tech Stack

- **Frontend**: SvelteKit 2.x with TypeScript
- **Styling**: TailwindCSS 4.x with Flowbite components
- **Web3**: Ethers.js 6.x, Reown AppKit
- **Charts**: Flowbite Svelte Charts
- **Build Tools**: Vite 6.x, Bun runtime
- **Deployment**: Vercel adapter
- **Flare**, **Hedera**, **Chainlink**

## 📦 Installation

### Prerequisites

- [Bun](https://bun.sh/) runtime
- Node.js 18+ (for compatibility)

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd market
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Environment Variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_REOWN_PROJECT_ID=your_reown_project_id
   ```

   Get your Reown Project ID from [Reown Cloud](https://cloud.reown.com/)

4. **Start development server**
   ```bash
   bun run dev
   ```

The application will be available at `http://localhost:5173`

## 🔧 Configuration

### Demo Configuration Panel

Access `/demo-config` to configure the demo environment:

#### Driver Points Configuration

- **Enable/Disable**: Toggle driver data availability
- **Data Limiter**: Set maximum accessible data rows (-1 for unlimited)
- **Custom Data**: Override default data with CSV format

#### Crypto Prices Configuration

- **Enable/Disable**: Toggle cryptocurrency data availability
- **Data Limiter**: Control data accessibility for demos
- **Custom Data**: Inject custom market data

### API Endpoints

The application provides RESTful endpoints for data management:

#### GET `/api/data`

Retrieve market data with query parameters:

- `type`: `'drivers'` or `'crypto'`
- `latest`: `'true'` for most recent data only
- `oracle`: `'true'` for blockchain-formatted data

#### POST `/api/data`

Update demo configuration:

```json
{
  "driverPoints": {
    "enabled": true,
    "customData": "Verstappen,Norris,Leclerc\n0.5,0.3,0.2",
    "dataLimiter": 10
  }
}
```

#### PUT `/api/data`

Reset configuration to defaults:

```json
{
  "reset": true
}
```

## 🏗 Architecture

### Frontend Structure

```
src/
├── lib/
│   ├── abi.ts           # Smart contract ABI
│   ├── api.ts           # API service functions
│   ├── appkit.ts        # Reown AppKit configuration
│   ├── fixtures.ts      # Default market data
│   ├── theme.ts         # Theme configuration
│   └── utils.ts         # Utility functions
├── routes/
│   ├── api/data/        # Backend API endpoints
│   ├── demo-config/     # Configuration panel
│   ├── market/[dataset] # Dynamic market pages
│   ├── +layout.svelte   # App layout with wallet integration
│   └── +page.svelte     # Home page
└── app.css              # Global styles
```

### Smart Contract Integration

The application interacts with a prediction market smart contract featuring:

- **Logarithmic Market Scoring Rules**: Efficient price discovery mechanism
- **Collateral Token Support**: ERC-20 token-based trading
- **Automated Market Making**: Self-balancing liquidity provision
- **Fee Structure**: Configurable trading fees

### Key Components

- **Market Maker**: Handles buy/sell orders and price calculations
- **Oracle Integration**: Fetches real-world data for settlement
- **Wallet Connection**: Seamless Web3 wallet integration
- **Chart Visualization**: Interactive data representation

## 🚀 Deployment

### Vercel Deployment

The application is configured for Vercel deployment:

1. **Connect Repository**: Link your Git repository to Vercel
2. **Environment Variables**: Set `VITE_REOWN_PROJECT_ID` in Vercel dashboard
3. **Deploy**: Automatic deployment on push to main branch

## 📝 API Documentation

Detailed API documentation is available in [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md), including:

- Endpoint specifications
- Request/response formats
- Configuration options
- Demo scenarios
- Error handling
