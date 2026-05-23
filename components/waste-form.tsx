"use client";

import React, { useState } from "react";
import { Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { FoodCategory, WasteReason, CATEGORY_METRIC_MAP } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface WasteFormProps {
  onAddLog: (log: {
    foodName: string;
    category: FoodCategory;
    weight: number;
    cost: number;
    reason: WasteReason;
    date: string;
  }) => Promise<void>;
}

export function WasteForm({ onAddLog }: WasteFormProps) {
  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState<FoodCategory>("produce");
  const [weight, setWeight] = useState("");
  const [cost, setCost] = useState("");
  const [reason, setReason] = useState<WasteReason>("spoiled");
  const [itemDate, setItemDate] = useState(() => {
    const today = new Date();
    const YYYY = today.getFullYear();
    const MM = String(today.getMonth() + 1).padStart(2, "0");
    const DD = String(today.getDate()).padStart(2, "0");
    return `${YYYY}-${MM}-${DD}`;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !weight || !cost || !itemDate) return;

    setIsSubmitting(true);
    try {
      await onAddLog({
        foodName,
        category,
        weight: parseFloat(weight),
        cost: parseFloat(cost),
        reason,
        date: itemDate,
      });

      // Reset form controls
      setFoodName("");
      setWeight("");
      setCost("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving your entry: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="panel-add-log-container" className="glass-panel border-none rounded-2xl shadow-xl self-start overflow-hidden w-full">
      <CardHeader className="pb-4 border-b border-white/5 bg-white/[0.02]">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" />
          Log Food Waste
        </CardTitle>
        <CardDescription className="text-xs text-stone-400 mt-1">
          Record discarded items to automatically compute real-time CO2 & water footprint penalties
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Food Name input */}
          <div className="space-y-1.5">
            <label htmlFor="food-name" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
              Food Item Name
            </label>
            <Input
              id="food-name"
              type="text"
              required
              placeholder="e.g. Organic spinach, Slices of Cheddar"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-4 py-2 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 transition-colors font-bold h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
            />
          </div>

          {/* Category Selector dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="food-category" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
              Category
            </label>
            <select
              id="food-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className="w-full px-4 py-2.5 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500 rounded-xl text-sm text-stone-200 font-bold transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {Object.entries(CATEGORY_METRIC_MAP).map(([key, value]) => (
                <option key={key} value={key} className="bg-stone-900 text-stone-200">
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* Two value columns: Weight & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="food-weight" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                Weight (lbs)
              </label>
              <Input
                id="food-weight"
                type="number"
                step="0.01"
                required
                min="0.01"
                placeholder="0.00"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-2 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 transition-colors font-bold h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="food-cost" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                Cost (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 text-sm font-bold">$</span>
                <Input
                  id="food-cost"
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 transition-colors font-bold h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Discard Reason input selection */}
          <div className="space-y-1.5">
            <label htmlFor="discard-reason" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
              Primary Discard Reason
            </label>
            <select
              id="discard-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as WasteReason)}
              className="w-full px-4 py-2.5 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500 rounded-xl text-sm text-stone-200 font-bold transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="spoiled" className="bg-stone-900 text-stone-200">Spoiled / Moldy / Sour</option>
              <option value="expired" className="bg-stone-900 text-stone-200">Past Expiration Label Date</option>
              <option value="leftover" className="bg-stone-900 text-stone-200">Leftover discarded plate scraps</option>
              <option value="overpurchased" className="bg-stone-900 text-stone-200">Over-purchased, wasn't prepared</option>
              <option value="other" className="bg-stone-900 text-stone-200">Other reason</option>
            </select>
          </div>

          {/* Calendar entry date selection */}
          <div className="space-y-1.5">
            <label htmlFor="discard-date" className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
              Date Thrown Away
            </label>
            <Input
              id="discard-date"
              type="date"
              required
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="w-full px-4 py-2 bg-black/20 hover:bg-black/35 focus:bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded-xl text-sm text-stone-200 transition-colors font-bold h-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500"
            />
          </div>

          {/* Submit Button */}
          <Button
            id="log-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 border border-emerald-500/20 hover:border-emerald-400 transition-all duration-200 disabled:opacity-50 mt-4 cursor-pointer h-11"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                LOGGING TO SUPABASE...
              </span>
            ) : (
              <>
                <Plus className="h-4.5 w-4.5" />
                Log Historical Entry
              </>
            )}
          </Button>

          {formSuccess && (
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs text-center font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-inner">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              Synced successfully to Supabase!
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
