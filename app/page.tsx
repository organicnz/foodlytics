"use client";

import React, { useState, useEffect } from "react";
import { Leaf, BarChart3, Sparkle, CookingPot, ChevronRight } from "lucide-react";
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
    try {
      const { data, error } = await supabase
        .from("household_waste_logs")
        .select("*")
        .order("discard_date", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

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
      throw new Error(err.message || "Error saving log to Supabase");
    }
  };

  // Handle Log Deletion directly in Supabase
  const handleDeleteLog = async (id: string) => {
    try {
      const { error } = await supabase.from("household_waste_logs").delete().eq("id", id);

      if (error) {
        throw new Error(error.message);
      }
      await fetchLogs();
    } catch (err: any) {
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
    <div className="min-h-screen bg-stone-50 text-stone-850 font-sans antialiased flex flex-col flex-1">
      {/* Upper Navigation Header bar */}
      <header
        id="foodlytics-header"
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/50 px-6 py-4"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand Logo Unit */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200/50 shrink-0">
              <Leaf className="h-5 w-5 fill-emerald-100/20" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Foodlytics
              </h1>
              <p className="text-xs text-stone-500 font-bold">
                Sustainable household food waste tracker & AI advisor
              </p>
            </div>
          </div>

          {/* Navigation Control Unit */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/50 font-semibold text-sm">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-stone-600 hover:text-stone-950 hover:bg-stone-50"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Impact Dashboard
            </button>
            <button
              id="tab-btn-advisor"
              onClick={() => setActiveTab("advisor")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs md:text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "advisor"
                  ? "bg-white text-emerald-800 shadow-sm"
                  : "text-stone-600 hover:text-stone-950 hover:bg-stone-50"
              }`}
            >
              <Sparkle className="h-4 w-4 text-emerald-600" />
              AI Advisor
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 flex flex-col justify-start">
        {logsError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200/50 text-rose-800 rounded-xl text-sm font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column A & B (2/3 width) - Charts Panel */}
                <div className="lg:col-span-2 space-y-8">
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
                  <div className="bg-emerald-900/5 rounded-2xl p-6 border border-emerald-900/10 flex flex-col md:flex-row items-center gap-6 justify-between">
                    <div className="space-y-2">
                      <h3 className="text-md font-bold text-emerald-950 flex items-center gap-2">
                        <CookingPot className="h-5 w-5 text-emerald-700" />
                        Did you know?
                      </h3>
                      <p className="text-sm text-emerald-900/80 leading-relaxed max-w-xl font-medium">
                        Almost <strong>40% of all food</strong> gets thrown away at home in the US. Wasted meat
                        generates roughly <strong>9 times</strong> the greenhouse gas emissions per pound than
                        wasted produce due to resources required in animal farming! Learn shelf-saving techniques
                        instantly.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("advisor")}
                      className="shrink-0 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-900/20 transition-all duration-200 cursor-pointer"
                    >
                      <Sparkle className="h-4 w-4" />
                      Ask AI Advisor
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Column C (1/3 width) - Form Input Panel */}
                <WasteForm onAddLog={handleAddLog} />
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
      <footer className="max-w-7xl mx-auto px-6 py-8 border-t border-stone-200/50 text-center text-xs text-stone-400 font-bold space-y-1 mt-12 bg-white rounded-t-3xl w-full">
        <p>Foodlytics Dashboard Application — Cultivating ecological mindfulness one home kitchen at a time.</p>
        <p className="text-stone-300 font-semibold">Calculations based on USDA and FAO household wastage benchmarks.</p>
      </footer>
    </div>
  );
}
