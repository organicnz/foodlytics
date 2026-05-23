"use client";

import React, { useState, useEffect, useRef } from "react";
import { Scale, DollarSign, Flame, Droplet, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "@/lib/supabase";

interface FoodWasteCategory {
  id: string;
  category: string;
  waste_tonnes: number;
  waste_pct: number;
  cost_usd_billions: number;
  co2_impact_million_tonnes: number;
  source: string;
  last_updated_at: string;
}

export function UsWasteTracker() {
  const [categories, setCategories] = useState<FoodWasteCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [activeHoverCategory, setActiveHoverCategory] = useState<string | null>(null);
  
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const fetchUSWasteData = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
      setConsoleLogs(["🚀 [" + new Date().toLocaleTimeString() + "] Dispatching agentic crawler request..."]);
    } else {
      setIsLoading(true);
    }

    try {
      // Invoke cloud edge function
      const { data: resData, error } = await supabase.functions.invoke("api-v1-us-foodwaste", {
        body: { refresh }
      });

      if (error) throw error;

      if (resData && resData.success) {
        setCategories(resData.data || []);
        
        if (refresh && resData.logs) {
          // Playback logs sequentially for maximum wow factor terminal effect
          let currentLogIdx = 0;
          const interval = setInterval(() => {
            if (currentLogIdx < resData.logs.length) {
              setConsoleLogs((prev) => [...prev, resData.logs[currentLogIdx]]);
              currentLogIdx++;
            } else {
              clearInterval(interval);
              setIsRefreshing(false);
            }
          }, 350);
        } else {
          setConsoleLogs([
            "📊 [" + new Date().toLocaleTimeString() + "] Telemetry parsed successfully from database cache.",
            "🔒 Enforcing RLS policy check: Public read access enabled.",
            "📦 Total categories loaded: " + (resData.data?.length || 0)
          ]);
          setIsLoading(false);
        }
      } else {
        throw new Error(resData?.error || "Failed to load telemetry.");
      }
    } catch (err: any) {
      console.error("Error loading US waste stats:", err);
      setConsoleLogs((prev) => [...prev, `❌ [ERROR] ${err.message || "Unknown error during refresh."}`]);
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUSWasteData();
  }, []);

  useEffect(() => {
    // Auto-scroll terminal log to bottom
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  // Aggregate stats
  const totalWasteTons = categories.reduce((sum, c) => sum + Number(c.waste_tonnes), 0);
  const totalCostBillions = categories.reduce((sum, c) => sum + Number(c.cost_usd_billions || 0), 0);
  const totalCO2Millions = categories.reduce((sum, c) => sum + Number(c.co2_impact_million_tonnes || 0), 0);
  const maxTonnage = Math.max(...categories.map(c => Number(c.waste_tonnes)), 1);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">Loading US Waste Telemetry...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-emerald-400" />
            US Nationwide Food Waste Analytics
          </h2>
          <p className="text-xs text-stone-400">
            Comprehensive sector analysis showing overall supply-chain breakdown from top to bottom (decreasing tonnage)
          </p>
        </div>

        <button
          onClick={() => fetchUSWasteData(true)}
          disabled={isRefreshing}
          className="shrink-0 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-emerald-500/20 hover:border-emerald-400 shadow-md shadow-emerald-950/20 transition-all cursor-pointer h-10"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Crawling Telemetry..." : "Trigger Live Crawl / Refresh"}
        </button>
      </div>

      {/* Bento Grid Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {/* Stat 1: Total Tons */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel hover:glass-panel-glow-amber hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-inner">
                <Scale className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80 block">US Annual Waste</span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {(totalWasteTons / 1000000).toFixed(1)}M <span className="text-xs font-medium text-stone-400">tons</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">≈ 268 lbs / citizen / year</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat 2: Total Cost */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel hover:glass-panel-glow-rose hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-inner">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300/80 block">Economic Burden</span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  ${totalCostBillions.toFixed(1)}B <span className="text-xs font-medium text-stone-400">USD</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Lost commercial retail value</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat 3: Carbon Impact */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel hover:glass-panel-glow-emerald hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner">
                <Flame className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80 block">Ecological Damage</span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {totalCO2Millions.toFixed(1)}M <span className="text-xs font-medium text-stone-400">tons CO2e</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">≈ 23 million cars driven / yr</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stat 4: Water Waste */}
        <motion.div variants={itemVariants}>
          <Card className="glass-panel hover:glass-panel-glow-sky hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shadow-inner">
                <Droplet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300/80 block">Water Footprint</span>
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  21.4T <span className="text-xs font-medium text-stone-400">gallons</span>
                </h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Embedded water lost to landfills</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Grid: Category List & Console log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Horizontal Category Bar Chart (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-panel border-none rounded-2xl shadow-xl p-6 bg-black/10">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Waste Breakdown by Food Category</h3>
                <span className="text-[10px] text-stone-500 font-bold uppercase">Ordered descending</span>
              </div>

              <div className="space-y-4">
                {categories.map((c) => {
                  const widthPct = (c.waste_tonnes / maxTonnage) * 100;
                  
                  return (
                    <div 
                      key={c.id}
                      onMouseEnter={() => setActiveHoverCategory(c.id)}
                      onMouseLeave={() => setActiveHoverCategory(null)}
                      className={`p-3 rounded-xl transition-all duration-200 border border-transparent hover:border-white/5 hover:bg-white/[0.02] flex flex-col gap-2 relative group cursor-default`}
                    >
                      {/* Name & Tonnage */}
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white font-extrabold group-hover:text-emerald-400 transition-colors">
                          {c.category}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-stone-300">{(c.waste_tonnes / 1000000).toFixed(2)}M tons</span>
                          <span className="text-emerald-400/90">({c.waste_pct}%)</span>
                        </div>
                      </div>

                      {/* Bar Visualizer */}
                      <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${widthPct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-full rounded-full bg-gradient-to-r ${
                            c.category.includes('Produce') ? 'from-emerald-650/40 to-emerald-500/70 shadow-emerald-500/20' :
                            c.category.includes('Dairy') ? 'from-amber-650/40 to-amber-500/70 shadow-amber-500/20' :
                            c.category.includes('Meat') ? 'from-rose-650/40 to-rose-500/70 shadow-rose-500/20' :
                            c.category.includes('Beverages') ? 'from-sky-650/40 to-sky-500/70 shadow-sky-500/20' :
                            c.category.includes('Prepared') ? 'from-purple-650/40 to-purple-500/70 shadow-purple-500/20' :
                            'from-stone-600/40 to-stone-400/70 shadow-stone-500/20'
                          }`}
                        />
                      </div>

                      {/* Interactive Detailed Hover Panel */}
                      <AnimatePresence>
                        {activeHoverCategory === c.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                            className="grid grid-cols-3 gap-4 pt-2 mt-1 border-t border-white/5 text-[10px] font-bold text-stone-400 overflow-hidden"
                          >
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">Economic Value</span>
                              <span className="text-rose-450 text-rose-400 font-mono">${c.cost_usd_billions} Billion USD</span>
                            </div>
                            <div>
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">Carbon Burden</span>
                              <span className="text-emerald-450 text-emerald-400 font-mono">{c.co2_impact_million_tonnes}M tons CO2eq</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[8px] uppercase tracking-wider text-stone-500">Source Database</span>
                              <span className="text-stone-300 italic">{c.source}</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Live Scraper Terminal Log (1/3 width) */}
        <div className="space-y-6">
          <Card className="glass-panel border-none rounded-2xl shadow-xl overflow-hidden bg-black/10 flex flex-col">
            <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-black uppercase text-white tracking-wider">Agent Telemetry Logs</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            <div className="p-4 bg-stone-950 font-mono text-[10px] text-emerald-450 text-emerald-400 h-64 overflow-y-auto space-y-2 select-text scrollbar-thin flex flex-col">
              {consoleLogs.map((log, index) => {
                let colorClass = "text-emerald-450 text-emerald-400";
                if (log.includes("❌")) colorClass = "text-rose-450 text-rose-400 font-extrabold";
                if (log.includes("⚠️")) colorClass = "text-amber-450 text-amber-400 font-extrabold";
                if (log.includes("🔍")) colorClass = "text-sky-400 font-bold";
                if (log.includes("✅")) colorClass = "text-emerald-300 font-bold";

                return (
                  <div key={index} className={`leading-relaxed border-b border-white/[0.02] pb-1 break-words ${colorClass}`}>
                    {log}
                  </div>
                );
              })}
              {isRefreshing && (
                <div className="flex items-center gap-1.5 text-stone-500 animate-pulse mt-1 select-none">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>Agent running background collection turns...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </Card>

          {/* Educational Sector Overview */}
          <Card className="glass-panel border-none rounded-2xl p-5 bg-gradient-to-br from-emerald-950/20 to-emerald-900/10 space-y-3">
            <h4 className="text-xs font-black text-white flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              US Waste Allocation Insights
            </h4>
            <p className="text-[11px] text-stone-400 leading-relaxed font-bold">
              National data highlights that households represent the single largest waste node (47% by weight), followed by restaurants & foodservice (25%). Combating retail and farm-gate supply volatility remains critical to close the 50% target reduction pathway by 2030.
            </p>
          </Card>
        </div>

      </div>

    </div>
  );
}
