"use client";

import React from "react";
import { Leaf } from "lucide-react";
import { FoodCategory, WasteReason, CATEGORY_METRIC_MAP, WasteEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "motion/react";

interface CategoryInsightsProps {
  logs: WasteEntry[];
  weightByCategory: Record<FoodCategory, number>;
  costByCategory: Record<FoodCategory, number>;
  maxCategoryWeight: number;
  reasonCounts: Record<WasteReason, number>;
  totalReasons: number;
  onAskCategoryAdvisor: (cat: FoodCategory) => void;
}

export function CategoryInsights({
  logs,
  weightByCategory,
  costByCategory,
  maxCategoryWeight,
  reasonCounts,
  totalReasons,
  onAskCategoryAdvisor,
}: CategoryInsightsProps) {
  return (
    <Card id="chart-weight-cost-breakdown" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div>
          <CardTitle className="text-lg font-bold text-stone-900">Category Contribution Insights</CardTitle>
          <CardDescription className="text-xs text-stone-500">
            Interactive visual summary breakdown of weight and money wasted
          </CardDescription>
        </div>
        <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-semibold">
          {logs.length} Logged Entries
        </span>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200/60">
            <Leaf className="h-8 w-8 stroke-stone-300 mb-2 animate-bounce" />
            <p className="text-sm font-medium">No food waste items logged yet.</p>
            <p className="text-xs mt-1 text-stone-400">Add items using the form to populate analytics!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Interactive custom Category Weight representation */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-600 uppercase tracking-widest">
                  Weight Wasted by Category (lbs)
                </span>
                <span className="text-xs text-stone-400 font-medium">Click "Tips" for storage hacks</span>
              </div>

              <div className="space-y-4">
                {Object.entries(CATEGORY_METRIC_MAP).map(([key, value]) => {
                  const curWeight = weightByCategory[key as FoodCategory] || 0;
                  const pctOfMax = (curWeight / maxCategoryWeight) * 100;

                  return (
                    <div
                      key={key}
                      className="group flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-stone-50/50 transition-colors duration-150"
                    >
                      <div className="w-1/3 flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: value.color }} />
                        <span className="text-sm font-semibold text-stone-700 truncate">{value.label.split(" (")[0]}</span>
                      </div>

                      {/* Custom dynamic bar representation */}
                      <div className="flex-1 bg-stone-100 h-3 rounded-full overflow-hidden relative">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: value.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pctOfMax || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>

                      <div className="w-28 text-right flex items-center justify-end gap-3">
                        <span className="text-sm font-bold text-stone-900 font-mono">{curWeight.toFixed(1)} lbs</span>
                        <button
                          onClick={() => onAskCategoryAdvisor(key as FoodCategory)}
                          className="text-[10px] px-2 py-1 font-bold border border-stone-200 rounded-md bg-white hover:border-emerald-500 hover:text-emerald-700 transition cursor-pointer"
                          title={`Ask AI advisor how to cut waste in ${value.label}`}
                        >
                          Tips
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost & Carbon foot-print aggregated comparative strip list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-stone-100 text-xs">
              <div>
                <span className="font-bold text-stone-600 uppercase block mb-3 tracking-wider">Value loss ranking</span>
                <div className="space-y-2">
                  {Object.entries(CATEGORY_METRIC_MAP)
                    .map(([key, val]) => ({ key, val, cost: costByCategory[key as FoodCategory] || 0 }))
                    .sort((a, b) => b.cost - a.cost)
                    .map((item) => (
                      <div key={item.key} className="flex justify-between items-center bg-stone-50 px-3 py-2 rounded-xl border border-stone-100/50">
                        <span className="text-stone-700 font-semibold truncate max-w-[140px]">
                          {item.val.label.split(" (")[0]}
                        </span>
                        <span className="font-bold text-stone-950 font-mono">${item.cost.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-stone-600 uppercase block mb-3 tracking-wider">Principal reason of discard</span>

                <div className="grid grid-cols-5 gap-2 h-20 items-end mt-4">
                  {(["spoiled", "expired", "leftover", "overpurchased", "other"] as WasteReason[]).map((r) => {
                    const count = reasonCounts[r] || 0;
                    const heightPct = (count / totalReasons) * 100;
                    return (
                      <div key={r} className="flex flex-col items-center gap-1 group">
                        {count > 0 && <span className="text-[10px] font-bold text-stone-700 font-mono">{count}</span>}
                        <div className="w-full bg-stone-100 hover:bg-stone-250/50 rounded-lg min-h-[4px] relative h-16">
                          <div
                            className={`absolute bottom-0 inset-x-0 rounded-lg transition-all duration-300 ${
                              r === "spoiled"
                                ? "bg-amber-400"
                                : r === "expired"
                                ? "bg-rose-400"
                                : r === "leftover"
                                ? "bg-emerald-450 bg-emerald-400"
                                : r === "overpurchased"
                                ? "bg-blue-400"
                                : "bg-stone-400"
                            }`}
                            style={{ height: `${Math.max(heightPct, 5)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-stone-400 uppercase truncate w-full text-center tracking-tight">
                          {r}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
