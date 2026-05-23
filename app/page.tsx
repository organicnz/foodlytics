"use client";

import React, { useState, useEffect } from "react";
import { Leaf, BarChart3, Sparkles, CookingPot, ChevronRight, Database, RotateCw, Award, Zap, Camera, Globe, Scale, DollarSign, Flame, Droplet, TrendingDown, Info, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FoodCategory, WasteReason, CATEGORY_METRIC_MAP, WasteEntry, ChatMessage } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { BentoStats } from "@/components/bento-stats";
import { WasteForm } from "@/components/waste-form";
import { CategoryInsights } from "@/components/category-insights";
import { LogsTable } from "@/components/logs-table";
import { AdvisorChat } from "@/components/advisor-chat";
import { CampaignTracker } from "@/components/campaign-tracker";
import { PriorityQueue } from "@/components/priority-queue";
import { FridgeScan } from "@/components/fridge-scan";
import { UsWasteTracker } from "@/components/us-waste-tracker";

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "campaign" | "interventions" | "scan" | "advisor" | "us-waste">("dashboard");

  // Dashboard state
  const [logs, setLogs] = useState<WasteEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // US categories macro data state
  const [usCategories, setUsCategories] = useState<any[]>([]);
  const [isLoadingUsCategories, setIsLoadingUsCategories] = useState(true);

  // Live DB Sync Observer HUD states
  const [dbStatus, setDbStatus] = useState<"connected" | "syncing" | "error">("connected");
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  // Advisor Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! Feed me your kitchen waste questions! Ask me how to store ingredients to double their lifespan, extract recipes from culinary scraps, or plan a zero-waste grocery run.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Fetch initial logs directly from Supabase Cloud
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    setDbStatus("syncing");
    const startTime = performance.now();
    try {
      const { data, error } = await supabase
        .from("household_waste_logs")
        .select("*")
        .order("discard_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const endTime = performance.now();
      setDbLatency(Math.round(endTime - startTime));
      setDbStatus("connected");

      const mappedData: WasteEntry[] = (data || []).map((item) => ({
        id: item.id,
        foodName: item.food_name,
        category: item.category as FoodCategory,
        weight: Number(item.weight_lbs),
        cost: Number(item.cost_usd),
        date: item.discard_date,
        reason: item.reason as WasteReason,
        co2Impact: Number(item.co2_impact_lbs),
        waterImpact: Math.round(item.water_impact_gal),
      }));

      setLogs(mappedData);
      setLogsError(null);
    } catch (err: any) {
      setDbStatus("error");
      setLogsError(err.message || "Could not connect to the Supabase database.");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // Fetch US categories telemetry once on mount
  const fetchUsCategories = async () => {
    setIsLoadingUsCategories(true);
    try {
      const { data, error } = await supabase
        .from("us_foodwaste_categories")
        .select("*")
        .order("waste_tonnes", { ascending: false });

      if (!error && data) {
        setUsCategories(data);
      }
    } catch (e) {
      console.error("Failed to load US categories macro stats:", e);
    } finally {
      setIsLoadingUsCategories(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchUsCategories();
  }, []);

  // Handle Form Submission directly to Supabase
  const handleAddLog = async (logData: {
    foodName: string;
    category: FoodCategory;
    weight: number;
    cost: number;
    reason: WasteReason;
    date: string;
  }) => {
    setDbStatus("syncing");
    try {
      const metrics = CATEGORY_METRIC_MAP[logData.category];
      const co2Val = Number((logData.weight * metrics.co2PerLb).toFixed(1));
      const waterVal = Math.round(logData.weight * metrics.waterPerLb);

      const { error } = await supabase.from("household_waste_logs").insert({
        food_name: String(logData.foodName),
        category: String(logData.category),
        weight_lbs: logData.weight,
        cost_usd: logData.cost,
        discard_date: String(logData.date),
        reason: String(logData.reason),
        co2_impact_lbs: co2Val,
        water_impact_gal: waterVal,
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchLogs();
    } catch (err: any) {
      setDbStatus("error");
      throw new Error(err.message || "Error saving log to Supabase");
    }
  };

  // Handle Log Deletion directly in Supabase
  const handleDeleteLog = async (id: string) => {
    setDbStatus("syncing");
    try {
      const { error } = await supabase.from("household_waste_logs").delete().eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
      await fetchLogs();
    } catch (err: any) {
      setDbStatus("error");
      alert("Error deleting entry from Supabase: " + err.message);
    }
  };

  // Handle AI Chat Submission directly to Supabase Edge Function
  const handleSendChatMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    setApiWarning(null);

    try {
      // Invoke deployed cloud Edge Function "api-v1-advisory"
      const { data, error } = await supabase.functions.invoke("api-v1-advisory", {
        body: { query: textToSend },
      });

      if (error) {
        throw new Error(error.message);
      }

      const replyText = typeof data === "string" ? data : data?.reply || data || "No response received.";
      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "model",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setApiWarning(err.message || "An error occurred calling the cloud Edge Function.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([
      {
        id: "welcome",
        role: "model",
        text: "Hello! Feed me your kitchen waste questions! Ask me how to store ingredients to double their lifespan, extract recipes from culinary scraps, or plan a zero-waste grocery run.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Fast prefill advisor from category tips
  const handleAskCategoryAdvisor = (cat: FoodCategory) => {
    setActiveTab("advisor");
    const query = `Provide practical storage, life-extension hacks, and recipe ideas specifically for the ${CATEGORY_METRIC_MAP[cat].label} category.`;
    handleSendChatMessage(query);
  };

  // Computational Aggregations for Statistics
  const totalCost = logs.reduce((sum, item) => sum + item.cost, 0);
  const totalWeight = logs.reduce((sum, item) => sum + item.weight, 0);
  const totalCO2 = logs.reduce((sum, item) => sum + item.co2Impact, 0);
  const totalWater = logs.reduce((sum, item) => sum + item.waterImpact, 0);

  // Grouped cost by Category for dynamic custom charts
  const costByCategory = logs.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.cost;
    return acc;
  }, {} as Record<FoodCategory, number>);

  const weightByCategory = logs.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.weight;
    return acc;
  }, {} as Record<FoodCategory, number>);

  const maxCategoryWeight = Math.max(...(Object.values(weightByCategory) as number[]), 1);

  // Reason Frequency count
  const reasonCounts = logs.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {} as Record<WasteReason, number>);

  const totalReasons: number =
    (Object.values(reasonCounts) as number[]).reduce((s, c) => s + c, 0) || 1;

  return (
    <div className="min-h-screen text-stone-200 font-sans antialiased flex flex-col flex-1 pb-12">
      
      {/* Upper Navigation Header bar */}
      <header
        id="foodlytics-header"
        className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/5 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Brand Logo Unit */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center text-emerald-450 text-emerald-400 shadow-inner shrink-0 animate-pulse">
              <Leaf className="h-5 w-5 fill-emerald-400/20" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Foodlytics
              </h1>
              <p className="text-[10px] text-stone-400 uppercase tracking-widest font-extrabold">
                Sustainable household food waste tracker & AI advisor
              </p>
            </div>
          </div>

          {/* Live DB Sync Observer HUD (Center/Right aligned) */}
          <div className="flex flex-wrap items-center gap-4 bg-black/30 border border-white/5 px-4 py-2 rounded-2xl text-[11px] font-bold shadow-inner">
            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="text-stone-400">Database Context:</span>
              <span className="text-white font-extrabold">Supabase Cloud</span>
            </div>

            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <span className="text-stone-400">Connection Status:</span>
              <span className="inline-flex items-center gap-1.5 font-extrabold text-white">
                <span className={`h-2.5 w-2.5 rounded-full inline-block ${
                  dbStatus === "connected"
                    ? "bg-emerald-500 shadow-md shadow-emerald-500/50 animate-pulse"
                    : dbStatus === "syncing"
                    ? "bg-amber-500 shadow-md shadow-amber-500/50 animate-bounce"
                    : "bg-rose-500 shadow-md shadow-rose-500/50 animate-ping"
                }`} />
                {dbStatus === "connected" && "Active 🟢"}
                {dbStatus === "syncing" && "Syncing 🟡"}
                {dbStatus === "error" && "Offline 🔴"}
              </span>
            </div>

            {dbLatency !== null && (
              <div className="flex items-center gap-1.5 pr-3 border-r border-white/10">
                <span className="text-stone-400">Latency:</span>
                <span className="text-emerald-400 font-mono font-extrabold">{dbLatency}ms</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 pr-2">
              <span className="text-stone-400">Synced Items:</span>
              <span className="text-white font-mono font-extrabold bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                {logs.length}
              </span>
            </div>

            <button
              onClick={fetchLogs}
              disabled={isLoadingLogs}
              title="Pull fresh data from Supabase DB"
              className="p-1 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${dbStatus === "syncing" ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Navigation Control Unit */}
          <div className="flex flex-wrap items-center bg-black/25 p-1 rounded-2xl border border-white/5 font-bold text-xs gap-1">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Impact Dashboard
            </button>
            <button
              id="tab-btn-campaign"
              onClick={() => setActiveTab("campaign")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "campaign"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-emerald-400" />
              50% Campaign
            </button>
            <button
              id="tab-btn-interventions"
              onClick={() => setActiveTab("interventions")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "interventions"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Priority Queue
            </button>
            <button
              id="tab-btn-us-waste"
              onClick={() => setActiveTab("us-waste")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "us-waste"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
              US Waste Tracker
            </button>
            <button
              id="tab-btn-scan"
              onClick={() => setActiveTab("scan")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "scan"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Camera className="h-3.5 w-3.5 text-emerald-400" />
              Fridge Scan
            </button>
            <button
              id="tab-btn-advisor"
              onClick={() => setActiveTab("advisor")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "advisor"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              AI Advisor
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col justify-start">
        {logsError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-bounce">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping shrink-0" />
            {logsError}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-10"
            >
              {/* Macro Section: Global Scale & US Nationwide Segments */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Globe className="h-5 w-5 text-emerald-450 text-emerald-450 text-emerald-400 animate-spin-slow" />
                    Global Scale & US Market Segments
                  </h2>
                  <p className="text-xs text-stone-400">
                    Contrasting global agricultural food loss metrics against verified US nationwide market sector segmentations
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                  {/* Left Panel (2/3 width) - Global Macro Benchmarks Bento */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Global Metric 1: Mass */}
                    <div className="glass-panel hover:glass-panel-glow-amber hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-5 bg-stone-900/10 border border-white/5 flex items-center gap-4 cursor-default">
                      <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-inner shrink-0">
                        <Scale className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block">Global Wasted Weight</span>
                        <h3 className="text-xl font-extrabold text-white tracking-tight">1.3 Billion <span className="text-xs font-semibold text-stone-400">tonnes/yr</span></h3>
                        <p className="text-[10px] text-stone-500 leading-normal font-bold">UNEP Food Waste Index findings</p>
                      </div>
                    </div>

                    {/* Global Metric 2: Financial */}
                    <div className="glass-panel hover:glass-panel-glow-rose hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-5 bg-stone-900/10 border border-white/5 flex items-center gap-4 cursor-default">
                      <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-inner shrink-0">
                        <DollarSign className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">Global Economic Loss</span>
                        <h3 className="text-xl font-extrabold text-white tracking-tight">$1.0 Trillion <span className="text-xs font-semibold text-stone-400">USD/yr</span></h3>
                        <p className="text-[10px] text-stone-500 leading-normal font-bold">FAO capital burden calculation</p>
                      </div>
                    </div>

                    {/* Global Metric 3: Carbon Impact */}
                    <div className="glass-panel hover:glass-panel-glow-emerald hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-5 bg-stone-900/10 border border-white/5 flex items-center gap-4 cursor-default">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner shrink-0">
                        <Flame className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">Global Ecological Penalty</span>
                        <h3 className="text-xl font-extrabold text-white tracking-tight">3.3 Billion <span className="text-xs font-semibold text-stone-400">tons CO2e</span></h3>
                        <p className="text-[10px] text-stone-500 leading-normal font-bold">Accounts for 8-10% of global GHGs</p>
                      </div>
                    </div>

                    {/* Global Metric 4: Water Impact */}
                    <div className="glass-panel hover:glass-panel-glow-sky hover:-translate-y-0.5 transition-all duration-300 rounded-2xl p-5 bg-stone-900/10 border border-white/5 flex items-center gap-4 cursor-default">
                      <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shadow-inner shrink-0">
                        <Droplet className="h-6 w-6" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 block">Global Freshwater Waste</span>
                        <h3 className="text-xl font-extrabold text-white tracking-tight">250 Cubic Km <span className="text-xs font-semibold text-stone-400">/yr</span></h3>
                        <p className="text-[10px] text-stone-500 leading-normal font-bold">3 times the volume of Lake Geneva</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel (1/3 width) - US Market Segments Visual List */}
                  <div className="glass-panel border-none rounded-2xl p-5 bg-black/15 border border-white/5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-wider">US Market Segmentation</h4>
                        <span className="text-[9px] text-emerald-400 font-extrabold">Active Baseline</span>
                      </div>

                      <div className="space-y-2.5">
                        {isLoadingUsCategories ? (
                          <div className="flex items-center justify-center py-6 gap-2 text-stone-500 text-[10px] font-bold">
                            <RotateCw className="h-3 w-3 animate-spin text-emerald-400" />
                            Loading US categories...
                          </div>
                        ) : usCategories.slice(0, 4).map((c) => (
                          <div key={c.id} className="space-y-1 text-[10px] font-bold">
                            <div className="flex justify-between text-stone-300">
                              <span className="truncate pr-2">{c.category.split(" (")[0]}</span>
                              <span className="text-white font-mono">{(Number(c.waste_tonnes) / 1000000).toFixed(1)}M tons ({c.waste_pct}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                              <div 
                                style={{ width: `${c.waste_pct * 2.5}%` }} 
                                className={`h-full rounded-full bg-gradient-to-r ${
                                  c.category.includes('Produce') ? 'from-emerald-650/40 to-emerald-500/70 shadow-emerald-500/20' :
                                  c.category.includes('Prepared') ? 'from-purple-650/40 to-purple-500/70 shadow-purple-500/20' :
                                  c.category.includes('Dairy') ? 'from-amber-650/40 to-amber-500/70 shadow-amber-500/20' :
                                  c.category.includes('Beverages') ? 'from-sky-650/40 to-sky-500/70 shadow-sky-500/20' :
                                  'from-stone-600/40 to-stone-400/70 shadow-stone-500/20'
                                }`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveTab("us-waste")}
                      className="w-full py-2 border border-white/5 hover:border-emerald-500/30 bg-white/[0.01] hover:bg-emerald-600/10 text-[9px] font-black uppercase tracking-widest text-stone-300 hover:text-white rounded-xl transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BarChart2 className="h-3 w-3 text-emerald-400" />
                      Explore All US Segments
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Local Footprint Divider Section */}
              <div className="relative py-1 flex items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 bg-black/10 px-4 py-1.5 rounded-full border border-white/5 select-none">
                  <Leaf className="h-3.5 w-3.5" />
                  Your Household Footprint
                </span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Highlight Stats Strip (Bento-grid like structure) */}
              <BentoStats
                totalCost={totalCost}
                totalWeight={totalWeight}
                totalCO2={totalCO2}
                totalWater={totalWater}
              />

              {/* Grid 2: Core Analytics Visualizers & Add Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Column A & B (2/3 width) - Charts Panel */}
                <div className="lg:col-span-2 space-y-6">
                  <CategoryInsights
                    logs={logs}
                    weightByCategory={weightByCategory}
                    costByCategory={costByCategory}
                    maxCategoryWeight={maxCategoryWeight}
                    reasonCounts={reasonCounts}
                    totalReasons={totalReasons}
                    onAskCategoryAdvisor={handleAskCategoryAdvisor}
                  />

                  {/* Informational Zero-Waste Educational Grid Panel */}
                  <div className="glass-panel border-none rounded-2xl p-6 bg-gradient-to-br from-emerald-950/20 to-emerald-900/10 flex flex-col md:flex-row items-center gap-6 justify-between shadow-xl">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <CookingPot className="h-5 w-5 text-emerald-450 text-emerald-400" />
                        Did you know?
                      </h3>
                      <p className="text-xs text-stone-400 leading-relaxed max-w-xl font-bold">
                        Almost <strong>40% of all food</strong> gets thrown away at home in the US. Wasted meat
                        generates roughly <strong>9 times</strong> the greenhouse gas emissions per pound than
                        wasted produce due to resources required in animal farming! Learn shelf-saving techniques
                        instantly from your dedicated AI advisor.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("advisor")}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/20 border border-emerald-500/20 hover:border-emerald-400 transition-all duration-200 cursor-pointer h-11"
                    >
                      <Sparkles className="h-4 w-4" />
                      Ask AI Advisor
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Column C (1/3 width) - Form Input Panel */}
                <div className="w-full">
                  <WasteForm onAddLog={handleAddLog} />
                </div>
              </div>

              {/* Dynamic Interactive LOGS TABLE */}
              <LogsTable logs={logs} onDeleteLog={handleDeleteLog} />
            </motion.div>
          )}

          {/* TAB 2: CAMPAIGN TRACKER */}
          {activeTab === "campaign" && (
            <motion.div
              key="campaign-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <CampaignTracker />
            </motion.div>
          )}

          {/* TAB 3: PRIORITY INTERVENTION QUEUE */}
          {activeTab === "interventions" && (
            <motion.div
              key="interventions-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <PriorityQueue />
            </motion.div>
          )}

          {/* TAB 4: FRIDGE SCAN */}
          {activeTab === "scan" && (
            <motion.div
              key="scan-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <FridgeScan />
            </motion.div>
          )}

          {/* TAB: US WASTE TRACKER */}
          {activeTab === "us-waste" && (
            <motion.div
              key="us-waste-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <UsWasteTracker />
            </motion.div>
          )}

          {/* TAB 5: AI EDUCATION ADVISOR */}
          {activeTab === "advisor" && (
            <motion.div
              key="advisor-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <AdvisorChat
                chatMessages={chatMessages}
                chatInput={chatInput}
                isChatLoading={isChatLoading}
                apiWarning={apiWarning}
                onSetChatInput={setChatInput}
                onSendChatMessage={handleSendChatMessage}
                onClearChat={handleClearChat}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Sustainable footer summary */}
      <footer className="max-w-7xl mx-auto px-6 py-6 border-t border-white/5 text-center text-[10px] text-stone-500 font-bold space-y-1 mt-16 rounded-t-3xl w-full select-none bg-black/10">
        <p>Foodlytics Ecological Analytics Platform — Cultivating ecological mindfulness one home kitchen at a time.</p>
        <p className="text-stone-600">Calculations based on standard USDA agricultural flow models and FAO food wastage coefficients.</p>
      </footer>
    </div>
  );
}
