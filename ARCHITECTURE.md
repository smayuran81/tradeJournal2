# Trading Journal Pro - Architecture Documentation

A comprehensive Next.js 14 trading journal application with AG-Grid, MongoDB, and Material-UI.

> **Last Updated:** 2026-02-04
> **Version:** 1.0.0

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Components Overview](#components-overview)
3. [Data Models](#data-models)
4. [API Routes](#api-routes)
5. [State Management](#state-management)
6. [Key Libraries](#key-libraries)
7. [Authentication](#authentication)
8. [Data Flow](#data-flow)
9. [Key Features](#key-features)
10. [Database Schema](#database-schema)
11. [Styling & Theming](#styling--theming)
12. [Development & Deployment](#development--deployment)
13. [Changelog](#changelog)

---

## Project Structure

```
/next-aggrid-ticker/
├── pages/                      # Next.js pages and API routes
│   ├── api/                   # Backend API endpoints
│   │   ├── auth/              # Authentication (login, logout, session)
│   │   ├── trades/            # Trade CRUD operations
│   │   ├── strategies/        # Strategy management
│   │   ├── weekly.js          # Weekly analysis
│   │   ├── weekly-prep.js     # Weekly prep questionnaires
│   │   ├── oanda/             # Oanda broker integration
│   │   └── upload-image.js    # Cloudinary image upload
│   ├── index.js               # Main dashboard home page
│   ├── login.js               # Login page
│   ├── landing.js             # Marketing landing page
│   └── trade-journal.js       # Dedicated trade journal page
├── components/                 # React components (24 total)
├── services/                   # Business logic & data access
│   └── repository.ts          # API abstraction layer
├── types/                      # TypeScript type definitions
│   └── models.ts              # Core data models
├── styles/                     # Global CSS styling
│   └── globals.css            # Theme and AG-Grid styles
├── data/                       # Static data
│   └── pairs.js               # Currency pairs list
├── .env                       # Environment variables
├── next.config.js             # Next.js configuration
└── middleware.js              # Request middleware
```

---

## Components Overview

### Major Components

| Component | Location | Lines | Purpose |
|-----------|----------|-------|---------|
| **TradeJournal** | `components/TradeJournal.jsx` | 2,069 | Main trading journal with AG-Grid table, trade CRUD, pip calculations |
| **StrategyPlaybook** | `components/StrategyPlaybook.jsx` | 1,691 | Strategy library with sections, subsections, rule cards, drag-and-drop |
| **WeeklyPrep** | `components/WeeklyPrep.jsx` | 1,011 | Weekly market analysis prep with ticker questionnaires |
| **Dashboard** | `components/Dashboard.jsx` | 308 | Dashboard view with stats aggregation and performance tracking |
| **ImageEditor** | `components/ImageEditor.jsx` | 295 | Canvas-based image annotation tool (pen, line, text, arrow) |
| **PairAnalysis** | `components/PairAnalysis.jsx` | 282 | Per-pair technical analysis form |

### Supporting Components

| Component | Purpose |
|-----------|---------|
| **Sidebar** | Navigation drawer with 8 menu items |
| **Topbar** | Header with user profile and logout |
| **ReviewPanel** | Structured trade review with prompts |
| **EditorPanel** | WYSIWYG editor with React-Quill |
| **TickerGrid** | AG-Grid for currency pair data |
| **WeekControls** | Week navigation controls |
| **TradeAnalysis** | Expandable trade analysis sections |
| **PlanForm** | Weekly trading plan form |
| **OandaTransactions** | Oanda account transactions display |
| **ChecklistPanel** | Strategy checklist tracking |
| **PairSelector** | Currency pair dropdown |
| **Toast** | Notification component |
| **AddPairModal** | Modal for adding currency pairs |

---

## Data Models

### Trade Object

```typescript
interface Trade {
  _id?: ObjectId;              // MongoDB ID
  id: string;                  // User-defined unique ID
  pair: string;                // e.g., "EUR/USD"
  entryPrice: string;
  exitPrice: string;
  stopLoss: string;
  takeProfit: string;
  result: 'Open' | 'Win' | 'Loss' | 'Breakeven';
  status: 'open' | 'closed';
  notes: string;
  images: string[];            // Base64 encoded
  date: string;
  createdAt: Date;
  updatedAt: Date;

  // Extended fields
  entryTime: string;           // ISO timestamp
  exitTime: string;
  rrAchieved: string;          // Risk-reward ratio achieved
  pipsGainedLost: number;
  reasonForEntry: string;
  riskRewardRatio: string;
  stopLossReason: string;
  takeProfitReason: string;
  whatWentWell: string;
  whatWentWrong: string;
  moodBeforeTrade: string;
  confidenceLevel: number;
  emotionalTriggers: string;
  emotionalFactors: string[];
  strategyUsed: string;
}
```

### Weekly Data

```typescript
interface WeeklyData {
  weekKey: string;             // ISO date of Monday
  pairs: CurrencyPair[];
  reviews: Record<string, PairReview>;
  createdAt: Date;
  updatedAt: Date;
}

interface PairReview {
  timeframes: {
    monthly: TimeframeAnalysis;
    weekly: TimeframeAnalysis;
    daily: TimeframeAnalysis;
  };
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  levels: TradingLevel[];      // Supply, Demand, Order Block, etc.
  observations: string;
  plan: TradingPlan;
  progress: DailyProgress;
  review: WeeklyReview;
}
```

### Trading Strategy

```typescript
interface TradingStrategy {
  _id: ObjectId;
  name: string;
  description: string;
  category: string;
  winRate: string;             // e.g., "65%"
  riskReward: string;          // e.g., "1:2"
  sections: StrategySection[];
  createdAt: Date;
  updatedAt: Date;
}

interface StrategySection {
  id: string;
  name: string;
  subsections: StrategySubsection[];
}

interface StrategySubsection {
  id: string;
  name: string;
  description: string;
  checkList?: string[];
  position?: number;
}
```

---

## API Routes

### Authentication

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Username/password authentication |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/auth/session` | GET | Validate current user |

### Trade Management

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/trades` | GET | Fetch all trades for user |
| `/api/trades` | POST | Create new trade |
| `/api/trades/[id]` | PUT | Update specific trade |
| `/api/trades/[id]` | DELETE | Delete specific trade |

### Weekly Analysis

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/weekly` | GET | Fetch weekly data by weekKey |
| `/api/weekly` | POST | Save/update weekly analysis |
| `/api/weekly-prep` | GET/POST/DELETE | Manage weekly prep data |

### Strategy Management

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/strategies` | GET | Fetch all strategies |
| `/api/strategies` | POST | Create new strategy |
| `/api/strategies` | PUT | Update strategy |
| `/api/strategies` | DELETE | Delete strategy |

### External Integrations

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/oanda/transactions` | GET | Fetch Oanda transactions |
| `/api/oanda/accounts` | GET | Fetch Oanda account info |
| `/api/upload-image` | POST | Upload to Cloudinary |

---

## State Management

The application uses **React's built-in patterns** without Redux or Context API:

1. **Component-level State** - `useState()` for local component state
2. **Repository Pattern** - `services/repository.ts` abstracts API calls
3. **Prop Drilling** - State passed from pages to child components
4. **localStorage Fallback** - Backup when MongoDB unavailable

### Repository Service Methods

```typescript
// Trade operations
repository.getTrades()
repository.saveTrade(trade)
repository.updateTrade(id, trade)
repository.deleteTrade(id)

// Weekly data operations
repository.getWeeklyData(weekKey)
repository.saveWeeklyData(weekKey, data)
repository.updatePairReview(weekKey, pair, review)
```

---

## Key Libraries

### Frontend
- **Next.js 14.0.4** - React framework
- **React 18** - UI library
- **@mui/material 5.15.0** - Component library
- **ag-grid-react 31.0.0** - Data grid component
- **react-quill 2.0.0** - WYSIWYG editor

### Backend
- **mongodb 6.3.0** - Database driver
- **cloudinary 1.41.0** - Image storage
- **next-auth 4.24.13** - Authentication

### Testing
- **@playwright/test 1.40.0** - E2E testing

---

## Authentication

### Current Implementation (Cookie-based)

**Demo Users:**
- `admin` / `admin123`
- `trader1` / `trader123`
- `demo` / `demo123`

**Flow:**
1. Login form submits to `/api/auth/login`
2. Server validates credentials
3. Sets HttpOnly session cookie (24h expiry)
4. Protected routes check `/api/auth/session`

### OAuth (Available but Disabled)
- NextAuth.js configured for GitHub and Google
- Can be enabled in `/pages/api/auth/[...nextauth].js`

---

## Data Flow

```
User Login (login.js)
        ↓
/api/auth/login → Sets session cookie
        ↓
Main App (index.js) → Checks /api/auth/session
        ↓
┌───────────────────────────────────────────────────┐
│                  Sidebar Navigation                │
├───────────────────────────────────────────────────┤
│                                                   │
│  Dashboard ──────→ repository.getTrades()         │
│      ↓              Aggregates stats              │
│  Stats Display                                    │
│                                                   │
│  TradeJournal ───→ AG-Grid with trades           │
│      ↓              CRUD operations               │
│  Image upload → Cloudinary                        │
│                                                   │
│  StrategyPlaybook → /api/strategies              │
│      ↓               Drag-and-drop reorder       │
│  Strategy cards                                   │
│                                                   │
│  WeeklyPrep ─────→ /api/weekly-prep              │
│      ↓              Ticker questionnaires        │
│  Strategy qualifiers                              │
│                                                   │
│  OandaTransactions → /api/oanda/transactions     │
│                                                   │
└───────────────────────────────────────────────────┘
        ↓
Database Layer (MongoDB):
  - trades collection
  - TradingStrategy collection
  - weekly collection
  - weeklyPrep collection
```

---

## Key Features

### Trade Journaling
1. Enter trade details (pair, entry, exit, SL, TP, result)
2. Auto-calculate pips and P&L
3. Attach strategy, timeframe, bias
4. Upload annotated chart images
5. Record pre/post-trade analysis

### Weekly Analysis
1. Select 10 major pairs for weekly prep
2. Answer questionnaire (HTF trend, S/R levels, news)
3. Select market bias (Bullish/Bearish/Neutral)
4. Qualify trades using strategy checkers
5. Record weekly review

### Strategy Management
1. Create/import trading strategies
2. Define sections (Setup, Entry, Exit, Risk)
3. Create rule cards with checklists
4. Drag-and-drop reordering
5. Link to trades during journaling

### Image Annotation
1. Upload chart image
2. Draw with pen, line, text, arrow tools
3. Save to Cloudinary
4. Attach to trade journal

---

## Database Schema

### MongoDB Collections

**trades**
```javascript
{
  _id: ObjectId,
  userId: String,           // For user isolation
  id: String,               // User-defined ID
  pair: String,
  entryPrice: String,
  exitPrice: String,
  stopLoss: String,
  takeProfit: String,
  result: String,
  status: String,
  notes: String,
  images: [String],
  date: String,
  // ... additional trade fields
  createdAt: Date,
  updatedAt: Date
}
```

**TradingStrategy**
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  category: String,
  winRate: String,
  riskReward: String,
  sections: [{
    id: String,
    name: String,
    subsections: [{
      id: String,
      name: String,
      description: String,
      checkList: [String],
      position: Number
    }]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**weekly**
```javascript
{
  weekKey: String,          // ISO Monday date
  pairs: [Object],
  reviews: Object,          // Pair -> PairReview mapping
  createdAt: Date,
  updatedAt: Date
}
```

**weeklyPrep**
```javascript
{
  weekKey: String,
  responses: Object,        // Ticker -> question responses
  createdAt: Date,
  updatedAt: Date
}
```

---

## Styling & Theming

### Material-UI Theme (`pages/_app.js`)

```javascript
{
  palette: {
    primary: { main: '#2b6ef6' },
    success: { main: '#0f9d58' },
    error: { main: '#d23f3f' },
    warning: { main: '#ffb86b' }
  }
}
```

### AG-Grid Theme
- Theme: `ag-theme-alpine`
- Custom cell colors:
  - Green: Wins
  - Red: Losses
  - Yellow: Breakeven

### Global Styles
- Location: `styles/globals.css`
- Responsive flexbox layout
- Custom scrollbars
- Form styling

---

## Development & Deployment

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### Environment Variables

```env
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Docker

```bash
# Build and run with Docker
docker-compose up
```

### Vercel Deployment
- Configured with `vercel.json`
- Standalone output enabled
- Environment variables in Vercel dashboard

---

## Utility Functions

### TradeJournal Helpers

| Function | Purpose |
|----------|---------|
| `pipUnitFor(pair)` | Calculate pip unit (0.01 for JPY, 0.0001 for others) |
| `pipDiffCalc(entry, exit, pair)` | Calculate pip difference |
| `statusFor(entry, exit, sl, tp)` | Determine trade result |

### WeeklyPrep Helpers

| Function | Purpose |
|----------|---------|
| `getWeekKey(date)` | Convert date to ISO week Monday |
| `getWeekRange(weekKey)` | Format week date range |
| `computeCompletionForTicker()` | Calculate questionnaire completion % |

---

## Code Patterns

1. **Dynamic Imports** - SSR-safe component loading
2. **Async Error Handling** - Try-catch with localStorage fallback
3. **Controlled Components** - Form state via useState
4. **Memoization** - useMemo/useCallback for performance
5. **Repository Pattern** - API abstraction layer

---

## Future Enhancement Notes

### Areas for Improvement
- Add Redux/Context for global state
- Implement CSRF protection
- Add input sanitization
- Enable OAuth providers
- Add unit tests
- Implement real-time updates (WebSocket)

### Extensible Points
- New strategies in `/api/strategies`
- Additional broker integrations in `/api/`
- New components in `/components/`
- Additional trade fields in `types/models.ts`

---

## Changelog

All notable changes to this project should be documented here.

### [1.0.0] - 2026-02-04

#### Added
- Initial architecture documentation created
- Documented all 24 React components
- API routes documentation
- Data models and TypeScript interfaces
- Database schema documentation
- Authentication flow documentation
- Development and deployment guides

---

## Maintenance Guidelines

**When to update this document:**

1. **New Component Added** - Add to Components Overview table
2. **New API Route** - Add to API Routes section
3. **Data Model Changed** - Update Data Models section
4. **New Library Added** - Update Key Libraries section
5. **Database Schema Changed** - Update Database Schema section
6. **Major Feature Added** - Add to Key Features and Changelog

**How to update:**

1. Update the relevant section(s)
2. Update the "Last Updated" date at the top
3. Increment version if significant changes
4. Add entry to Changelog with date and description

**Version numbering:**
- **Major (X.0.0)** - Breaking changes or major rewrites
- **Minor (0.X.0)** - New features or significant updates
- **Patch (0.0.X)** - Bug fixes or minor documentation updates
