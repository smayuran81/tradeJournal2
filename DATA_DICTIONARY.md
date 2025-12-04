# TradingJournal Pro - Data Dictionary

## Database Structure

### Environment-Based Database Selection
- **Development**: `DEV` database
- **Production**: `production` database
- **Selection Logic**: `process.env.PROFILE === 'dev' || 'development' ? 'DEV' : 'production'`

---

## Collections Overview

| Collection | Purpose | API Endpoints |
|------------|---------|---------------|
| `trades` | Trading journal entries | `/api/trades`, `/api/trades/[id]` |
| `TradingStrategy` | Strategy playbook & dropdown entries | `/api/strategies`, `/api/trading-strategies` |
| `rule-cards` | Strategy rule cards | `/api/rule-cards` |

---

## 1. TRADES Collection

### Dashboard Fields → MongoDB Mapping

| Dashboard Field | MongoDB Field | Type | Description | Example |
|----------------|---------------|------|-------------|---------|
| **Trade ID** | `_id` | ObjectId | Auto-generated unique identifier | `ObjectId("...")` |
| **User** | `userId` | String | User identifier for data isolation | `"admin"` |
| **Pair** | `pair` | String | Currency pair | `"EUR/USD"` |
| **Entry Price** | `entryPrice` | String/Number | Trade entry price | `"1.0923"` |
| **Exit Price** | `exitPrice` | String/Number | Trade exit price | `"1.0945"` |
| **Stop Loss** | `stopLoss` | String/Number | Stop loss level | `"1.0900"` |
| **Take Profit** | `takeProfit` | String/Number | Take profit level | `"1.0950"` |
| **Entry Time** | `entryTime` | Date/String | Trade entry timestamp | `"2024-01-15T10:30:00Z"` |
| **Exit Time** | `exitTime` | Date/String | Trade exit timestamp | `"2024-01-15T14:20:00Z"` |
| **Result** | `result` | String | Trade outcome | `"Win"`, `"Loss"`, `"Breakeven"`, `"Open"` |
| **Lots** | `lots` | Number | Position size | `0.1` |
| **P&L** | `pnl` | Number | Profit/Loss amount | `22.50` |
| **RR** | `rr` | String | Risk-Reward ratio | `"2.5R"`, `"0R"` |
| **Notes** | `notes` | String | Trade analysis notes | `"Strong bullish momentum"` |
| **Images** | `images` | Array | Cloudinary image URLs | `["url1", "url2"]` |
| **Created** | `createdAt` | Date | Record creation timestamp | `new Date()` |
| **Updated** | `updatedAt` | Date | Last modification timestamp | `new Date()` |

### Trade Schema Example
```javascript
{
  _id: ObjectId("..."),
  userId: "admin",
  pair: "EUR/USD",
  entryPrice: "1.0923",
  exitPrice: "1.0945", 
  stopLoss: "1.0900",
  takeProfit: "1.0950",
  entryTime: "2024-01-15T10:30:00Z",
  exitTime: "2024-01-15T14:20:00Z",
  result: "Win",
  lots: 0.1,
  pnl: 22.50,
  rr: "2.5R",
  notes: "Strong bullish momentum",
  images: ["cloudinary_url_1", "cloudinary_url_2"],
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

## 2. TRADINGSTRATEGY Collection

### Dashboard Fields → MongoDB Mapping

| Dashboard Field | MongoDB Field | Type | Description | Example |
|----------------|---------------|------|-------------|---------|
| **Strategy ID** | `_id` | ObjectId | Auto-generated unique identifier | `ObjectId("...")` |
| **Name** | `name` | String | Strategy name | `"Breakout Strategy"` |
| **Description** | `description` | String | Strategy overview | `"Momentum-based breakout trading"` |
| **Setup Description** | `setupDescription` | String | Detailed setup instructions | `"Wait for consolidation..."` |
| **Setup Image** | `setupImage` | String | Cloudinary image URL | `"cloudinary_url"` |
| **Sections** | `sections` | Array | Strategy sections with subsections | See below |
| **Pin Position** | `pinPosition` | Object | Card pin coordinates | `{x: 10, y: 20}` |
| **Created** | `createdAt` | Date | Record creation timestamp | `new Date()` |
| **Updated** | `updatedAt` | Date | Last modification timestamp | `new Date()` |

### Strategy Sections Structure
```javascript
sections: [
  {
    id: "entry-rules",
    name: "Entry Rules", 
    subsections: [
      {
        id: "technical-setup",
        name: "Technical Setup"
      },
      {
        id: "confirmation",
        name: "Confirmation"
      }
    ]
  }
]
```

### Strategy Schema Example
```javascript
{
  _id: ObjectId("..."),
  name: "Breakout Strategy",
  description: "Momentum-based breakout trading",
  setupDescription: "Wait for consolidation pattern...",
  setupImage: "cloudinary_url",
  sections: [
    {
      id: "entry-rules",
      name: "Entry Rules",
      subsections: [
        { id: "technical-setup", name: "Technical Setup" },
        { id: "confirmation", name: "Confirmation" }
      ]
    }
  ],
  pinPosition: { x: 10, y: 20 },
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

## 3. RULE-CARDS Collection

### Dashboard Fields → MongoDB Mapping

| Dashboard Field | MongoDB Field | Type | Description | Example |
|----------------|---------------|------|-------------|---------|
| **Card ID** | `_id` | ObjectId | Auto-generated unique identifier | `ObjectId("...")` |
| **Strategy Link** | `strategyId` | String | Parent strategy identifier | `"strategy_id_123"` |
| **Section Link** | `sectionId` | String | Parent section identifier | `"entry-rules"` |
| **Subsection Link** | `subsectionId` | String | Parent subsection identifier | `"technical-setup"` |
| **Title** | `title` | String | Rule card title | `"Price Action Setup"` |
| **Content** | `content` | String | Rule description | `"Look for higher highs..."` |
| **Checklist** | `checklist` | Array | Rule checklist items | See below |
| **Image** | `image` | String | Cloudinary image URL | `"cloudinary_url"` |
| **Pin Position** | `pinPosition` | Object | Card pin coordinates | `{x: 15, y: 25}` |
| **Created** | `createdAt` | Date | Record creation timestamp | `new Date()` |
| **Updated** | `updatedAt` | Date | Last modification timestamp | `new Date()` |

### Rule Card Checklist Structure
```javascript
checklist: [
  {
    id: "check_1",
    text: "Price above 20 EMA",
    checked: false
  },
  {
    id: "check_2", 
    text: "Volume confirmation",
    checked: true
  }
]
```

### Rule Card Schema Example
```javascript
{
  _id: ObjectId("..."),
  strategyId: "strategy_id_123",
  sectionId: "entry-rules",
  subsectionId: "technical-setup",
  title: "Price Action Setup",
  content: "Look for higher highs and higher lows...",
  checklist: [
    { id: "check_1", text: "Price above 20 EMA", checked: false },
    { id: "check_2", text: "Volume confirmation", checked: true }
  ],
  image: "cloudinary_url",
  pinPosition: { x: 15, y: 25 },
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

## 4. TRADINGSTRATEGY Collection

### Dashboard Fields → MongoDB Mapping

| Dashboard Field | MongoDB Field | Type | Description | Example |
|----------------|---------------|------|-------------|---------||
| **Strategy ID** | `_id` | ObjectId | Auto-generated unique identifier | `ObjectId("...")` |
| **Name** | `name` | String | Strategy name for dropdown | `"Breakout Strategy"` |
| **Description** | `description` | String | Strategy description | `"Momentum-based breakout trading"` |
| **Category** | `category` | String | Strategy category | `"Momentum"`, `"Price Action"` |
| **Active** | `active` | Boolean | Whether strategy is available | `true`, `false` |
| **Created** | `createdAt` | Date | Record creation timestamp | `new Date()` |
| **Updated** | `updatedAt` | Date | Last modification timestamp | `new Date()` |

### Trading Strategy Schema Example
```javascript
{
  _id: ObjectId("..."),
  name: "Breakout Strategy",
  description: "Momentum-based breakout trading on key levels",
  category: "Momentum",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
}
```

---

## API Endpoints & Operations

### Trades API (`/api/trades`)
- **GET**: Fetch all trades for user (`userId` filter)
- **POST**: Create new trade
- **PUT**: Update existing trade
- **DELETE**: Remove trade

### Strategies API (`/api/strategies`) - Uses TradingStrategy Collection
- **GET**: Fetch all strategies
- **POST**: Create new strategy
- **PUT**: Update strategy (sections, description, etc.)
- **DELETE**: Remove strategy

### Rule Cards API (`/api/rule-cards`)
- **GET**: Fetch cards by `strategyId` and `sectionId`
- **POST**: Create new rule card
- **PUT**: Update card content/checklist
- **DELETE**: Remove rule card

### Trading Strategies API (`/api/trading-strategies`)
- **GET**: Fetch all active trading strategies (sorted by name)
- **POST**: Create new trading strategy
- **PUT**: Update strategy details
- **DELETE**: Remove trading strategy

---

## Data Relationships

```
STRATEGIES (1) ←→ (Many) RULE-CARDS
    ↓
  sections[]
    ↓
  subsections[]

TRADES ←→ USER (userId isolation)

RULE-CARDS ←→ STRATEGIES (strategyId)
RULE-CARDS ←→ SECTIONS (sectionId)
RULE-CARDS ←→ SUBSECTIONS (subsectionId)

TRADES ←→ TRADINGSTRATEGY (strategy name reference)
TRADINGSTRATEGY ←→ STRATEGIES (name matching for playbook integration)
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | Database connection | `mongodb+srv://...` |
| `PROFILE` | Environment selector | `dev`, `production` |
| `CLOUDINARY_CLOUD_NAME` | Image storage | `your-cloud-name` |
| `CLOUDINARY_API_KEY` | Image API key | `your-api-key` |
| `CLOUDINARY_API_SECRET` | Image API secret | `your-api-secret` |

---

## Data Validation Rules

### Trades
- `userId`: Required for data isolation
- `pair`: Must be valid currency pair
- `result`: Enum ["Win", "Loss", "Breakeven", "Open"]
- `entryPrice`, `exitPrice`: Numeric strings
- `lots`: Positive number
- `rr`: String with "R" suffix or "0R" for breakeven

### Strategies
- `name`: Required, unique per strategy
- `sections`: Array with id/name structure
- `pinPosition`: Object with x/y coordinates

### Rule Cards
- `strategyId`: Must reference existing strategy
- `sectionId`: Must exist in parent strategy sections
- `title`: Required for card identification
- `checklist`: Array of objects with id/text/checked

### Trading Strategies
- `name`: Required, unique strategy name
- `description`: Strategy overview text
- `category`: Strategy classification
- `active`: Boolean flag for availability in dropdowns