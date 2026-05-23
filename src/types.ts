export type FoodCategory = 'produce' | 'dairy' | 'meat_seafood' | 'bakery' | 'dry_pantry' | 'meals' | 'other';

export type WasteReason = 'expired' | 'spoiled' | 'leftover' | 'overpurchased' | 'other';

export interface WasteEntry {
  id: string;
  foodName: string;
  category: FoodCategory;
  weight: number; // in lbs
  cost: number; // in USD
  date: string;
  reason: WasteReason;
  co2Impact: number; // in lbs CO2e
  waterImpact: number; // in Gallons of water
}

export interface FoodWasteStats {
  category: FoodCategory;
  label: string;
  color: string;
  nationalAveragePercentage: number; // how much of total household waste is this
  co2PerLb: number; // multiplier
  waterPerLb: number; // multiplier (gallons)
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const CATEGORY_METRIC_MAP: Record<FoodCategory, { label: string; color: string; co2PerLb: number; waterPerLb: number }> = {
  produce: { label: 'Produce (Fruits & Veggies)', color: '#22c55e', co2PerLb: 1.4, waterPerLb: 35 },
  dairy: { label: 'Dairy & Eggs', color: '#3b82f6', co2PerLb: 4.8, waterPerLb: 120 },
  meat_seafood: { label: 'Meat & Seafood', color: '#ef4444', co2PerLb: 12.5, waterPerLb: 600 },
  bakery: { label: 'Bakery & Bread', color: '#f59e0b', co2PerLb: 1.8, waterPerLb: 80 },
  dry_pantry: { label: 'Dry Goods & Pantry', color: '#a855f7', co2PerLb: 1.2, waterPerLb: 45 },
  meals: { label: 'Prepared Meals', color: '#ec4899', co2PerLb: 3.2, waterPerLb: 150 },
  other: { label: 'Other', color: '#6b7280', co2PerLb: 2.0, waterPerLb: 90 },
};
