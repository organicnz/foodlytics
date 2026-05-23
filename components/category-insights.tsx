"use client";

import React from "react";
import { Leaf, Award, ShieldAlert, Sparkles } from "lucide-react";
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
    <Card id="chart-weight-cost-breakdown" className="glass-panel border-none rounded-2xl shadow-xl overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5 bg-white/[0.02]">
        <div>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-emerald-400" />
            Category Contribution Insights
          </CardTitle>
          <CardDescription className="text-xs text-stone-400 mt-1">
            Dynamic distribution breakdown of weight mass and financial loss
          </CardDescription>
        </div>
        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-1.5 rounded-full font-bold self-start sm:self-center shadow-inner tracking-wide">
          {logs.length} Logged {logs.length === 1 ? "Entry" : "Entries"}
        </span>
      </CardHeader>

      <CardContent className="pt-6">
        {logs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-stone-400 bg-white/[0.02] rounded-xl border border-dashed border-white/10 p-6">
            <Leaf className="h-9 w-9 stroke-emerald-500/40 mb-3 animate-bounce" />
            <p className="text-sm font-bold text-stone-300">No food waste items logged yet</p>
            <p className="text-xs mt-1.5 text-stone-500 text-center max-w-[280px]">
              Add items using the log form to generate professional ecological metrics instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Category Weight Contribution progress rows */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                  Weight Wasted by Category
                </span>
                <span className="text-xs text-stone-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  Tips provide AI storage secrets
                </span>
              </div>

              <div className="space-y-4">
                {Object.entries(CATEGORY_METRIC_MAP).map(([key, value]) => {
                  const curWeight = weightByCategory[key as FoodCategory] || 0;
                  const pctOfMax = (curWeight / maxCategoryWeight) * 100;

                  return (
                    <div
                      key={key}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 p-2.5 rounded-xl hover:bg-white/[0.03] border border-transparent hover:border-white/5 transition-all duration-200"
                    >
                      <div className="sm:w-1/3 flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full shrink-0 shadow-md" style={{ backgroundColor: value.color, boxShadow: `0 0 8px ${value.color}` }} />
                        <span className="text-sm font-bold text-stone-200 truncate">{value.label.split(" (")[0]}</span>
                      </div>

                      {/* Custom premium slider line */}
                      <div className="flex-1 bg-white/[0.05] h-3 rounded-full overflow-hidden relative border border-white/5">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ 
                            backgroundColor: value.color,
                            boxShadow: `0 0 10px ${value.color}`
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pctOfMax || 0}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>

                      <div className="sm:w-32 text-right flex items-center justify-between sm:justify-end gap-3.5">
                        <span className="text-sm font-bold text-stone-100 font-mono tracking-tight">{curWeight.toFixed(1)} lbs</span>
                        <button
                          onClick={() => onAskCategoryAdvisor(key as FoodCategory)}
                          className="text-[10px] px-2.5 py-1.5 font-bold border border-white/10 rounded-lg bg-white/5 text-stone-300 hover:text-white hover:border-emerald-500 hover:bg-emerald-500/10 transition duration-150 cursor-pointer shadow-sm"
                          title={`Ask AI preservation advisor about ${value.label}`}
                        >
                          Tips
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Panel Grid split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5 text-xs">
              {/* Left Column: Financial Loss ranking */}
              <div>
                <span className="font-bold text-stone-400 uppercase tracking-widest block mb-4">
                  Financial Loss Ranking
                </span>
                <div className="space-y-2.5">
                  {Object.entries(CATEGORY_METRIC_MAP)
                    .map(([key, val]) => ({ key, val, cost: costByCategory[key as FoodCategory] || 0 }))
                    .sort((a, b) => b.cost - a.cost)
                    .map((item) => (
                      <div 
                        key={item.key} 
                        className="flex justify-between items-center bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 rounded-xl border border-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.val.color }} />
                          <span className="text-stone-300 font-bold truncate">
                            {item.val.label.split(" (")[0]}
                          </span>
                        </div>
                        <span className="font-bold text-white font-mono text-sm tracking-tight">
                          ${item.cost.toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Discard Reason Volumetric Columns */}
              <div>
                <span className="font-bold text-stone-400 uppercase tracking-widest block mb-4">
                  Primary Discard Reasons
                </span>

                <div className="grid grid-cols-5 gap-3 h-52 items-end mt-4 px-2">
                  {(["spoiled", "expired", "leftover", "overpurchased", "other"] as WasteReason[]).map((r) => {
                    const count = reasonCounts[r] || 0;
                    const heightPct = (count / totalReasons) * 100;
                    
                    let reasonColor = "oklch(0.7 0.05 150)"; // default
                    if (r === "spoiled") reasonColor = "oklch(0.78 0.16 80)"; // yellow/amber
                    if (r === "expired") reasonColor = "oklch(0.58 0.22 25)"; // red/rose
                    if (r === "leftover") reasonColor = "oklch(0.72 0.16 150)"; // green/mint
                    if (r === "overpurchased") reasonColor = "oklch(0.6 0.16 250)"; // blue
                    if (r === "other") reasonColor = "oklch(0.65 0.02 150)"; // stone

                    return (
                      <div key={r} className="flex flex-col items-center gap-2.5 group h-full justify-end">
                        {count > 0 ? (
                          <span className="text-[10px] font-bold text-white font-mono bg-white/5 border border-white/10 rounded-md px-1.5 py-0.5 shadow-sm">
                            {count}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-stone-600 font-mono">—</span>
                        )}
                        
                        <div className="w-full bg-white/[0.02] hover:bg-white/[0.04] rounded-lg border border-white/5 h-36 relative flex items-end overflow-hidden">
                          <motion.div
                            className="w-full rounded-b-md transition-all duration-300"
                            style={{ 
                              height: `${Math.max(heightPct, 3)}%`,
                              backgroundColor: reasonColor,
                              boxShadow: `0 0 12px ${reasonColor}40`
                            }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <span 
                          className="text-[9px] font-bold text-stone-400 uppercase truncate w-full text-center tracking-wider hover:text-white transition-colors cursor-default"
                          title={r.toUpperCase()}
                        >
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
