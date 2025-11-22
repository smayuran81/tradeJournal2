import { ObjectId } from 'mongodb'

// Trade Journal Models
export interface Trade {
  _id?: ObjectId
  id: string
  pair: string
  entryPrice: string
  exitPrice: string
  stopLoss: string
  takeProfit: string
  result: 'Open' | 'Win' | 'Loss' | 'Breakeven'
  status: 'open' | 'closed'
  notes: string
  images: string[] // base64 strings
  date: string
  createdAt: Date
  updatedAt: Date
  review?: TradeReview
}

export interface TradeReview {
  notes: string
  html?: string
  images?: string[]
  updatedAt: Date
}

// Weekly Analysis Models
export interface WeeklyData {
  _id?: ObjectId
  weekKey: string // ISO date string (Monday of week)
  pairs: CurrencyPair[]
  reviews: Record<string, PairReview>
  createdAt: Date
  updatedAt: Date
}

export interface CurrencyPair {
  pair: string
  bid: string
  ask: string
  createdAt?: number
}

export interface PairReview {
  timeframes?: {
    monthly: TimeframeAnalysis
    weekly: TimeframeAnalysis
    daily: TimeframeAnalysis
  }
  bias?: 'Bullish' | 'Bearish' | 'Neutral'
  levels?: TradingLevel[]
  observations?: string
  plan?: TradingPlan
  progress?: DailyProgress
  review?: WeeklyReview
  meta?: {
    updatedAt: number
  }
}

export interface TimeframeAnalysis {
  trend: 'Uptrend' | 'Downtrend' | 'Ranging' | ''
  notes: string
}

export interface TradingLevel {
  id: number
  type: 'Supply' | 'Demand' | 'Order Block' | 'Imbalance' | 'Other'
  note: string
}

export interface TradingPlan {
  weeklyPlan?: string
  entryTriggers?: string
  invalidation?: string
  risk?: string
  plan?: string
}

export interface DailyProgress {
  daily: Record<string, Record<string, boolean>> // day -> checklistId -> completed
}

export interface WeeklyReview {
  notes: string
  result?: string
  answers?: string[]
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface TradeListResponse extends ApiResponse<Trade[]> {}
export interface TradeResponse extends ApiResponse<Trade> {}
export interface WeeklyDataResponse extends ApiResponse<WeeklyData> {}