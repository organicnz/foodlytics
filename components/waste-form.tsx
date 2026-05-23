"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
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
    <Card id="panel-add-log-container" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm self-start">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-stone-900">Log Food Waste</CardTitle>
        <CardDescription className="text-xs text-stone-500">
          Log spoiled, expired, or leftover food items to view environmental footprint impact estimates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Food Name input */}
          <div className="space-y-1.5">
            <label htmlFor="food-name" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
              Food Item Name
            </label>
            <Input
              id="food-name"
              type="text"
              required
              placeholder="e.g. Fresh spinach bag, Slices of Cheddar"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-stone-200 transition-colors bg-stone-50/50"
            />
          </div>

          {/* Category Selector dropdown */}
          <div className="space-y-1.5">
            <label htmlFor="food-category" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
              Category
            </label>
            <select
              id="food-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as FoodCategory)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {Object.entries(CATEGORY_METRIC_MAP).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>

          {/* Two value columns: Weight & Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="food-weight" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
                Weight (lbs)
              </label>
              <Input
                id="food-weight"
                type="number"
                step="0.01"
                required
                min="0.01"
                placeholder="e.g. 1.2"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="food-cost" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
                Cost (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-semibold">$</span>
                <Input
                  id="food-cost"
                  type="number"
                  step="0.01"
                  required
                  min="0.01;;"
                  placeholder="4.99"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
                />
              </div>
            </div>
          </div>

          {/* Discard Reason input selection */}
          <div className="space-y-1.5">
            <label htmlFor="discard-reason" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
              Primary Reason
            </label>
            <select
              id="discard-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as WasteReason)}
              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-sm bg-stone-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="spoiled">Spoiled / Moldy / Sour</option>
              <option value="expired">Past Expiration Label Date</option>
              <option value="leftover">Leftover discarded plate scraps</option>
              <option value="overpurchased">Over-purchased, wasn't prepared</option>
              <option value="other">Other reason</option>
            </select>
          </div>

          {/* Calendar entry date selection */}
          <div className="space-y-1.5">
            <label htmlFor="discard-date" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">
              Date Thrown Away
            </label>
            <Input
              id="discard-date"
              type="date"
              required
              value={itemDate}
              onChange={(e) => setItemDate(e.target.value)}
              className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
            />
          </div>

          {/* Submit Button */}
          <Button
            id="log-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 mt-2 cursor-pointer h-11"
          >
            {isSubmitting ? (
              "Adding..."
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Log Entry
              </>
            )}
          </Button>

          {formSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-xl text-xs text-center font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
              Entry logged and ecological impacts updated!
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
