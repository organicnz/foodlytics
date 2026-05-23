"use client";

import React, { useState, useEffect } from "react";
import { Leaf, BarChart3, Sparkles, CookingPot, ChevronRight, Database, RotateCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FoodCategory, WasteReason, CATEGORY_METRIC_MAP, WasteEntry, ChatMessage } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { BentoStats } from "@/components/bento-stats";
import { WasteForm } from "@/components/waste-form";
import { CategoryInsights } from "@/components/category-insights";
import { LogsTable } from "@/components/logs-table";
import { AdvisorChat } from "@/components/advisor-chat";

export default function Home() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "advisor">("dashboard");

  // Dashboard state
  const [logs, setLogs] = useState<WasteEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchLogs();
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
      // Invoke deployed cloud Edge Function "api-v1-chat"
      const { data, error } = await supabase.functions.invoke("api-v1-chat", {
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
          <div className="flex items-center bg-black/25 p-1 rounded-2xl border border-white/5 font-bold text-xs">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-450 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Impact Dashboard
            </button>
            <button
              id="tab-btn-advisor"
              onClick={() => setActiveTab("advisor")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === "advisor"
                  ? "bg-white/10 text-white border border-white/10 shadow-md"
                  : "text-stone-450 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
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
              className="space-y-8"
            >
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

          {/* TAB 2: AI EDUCATION ADVISOR */}
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
