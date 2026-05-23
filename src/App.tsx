/// <reference types="vite/client" />
import React, { useState, useEffect } from "react";
import { 
  Leaf, 
  Trash2, 
  Plus, 
  DollarSign, 
  Scale, 
  Flame, 
  Droplet, 
  Calendar, 
  Info, 
  ChevronRight, 
  Send, 
  RotateCcw, 
  Sparkle, 
  BookOpen, 
  BarChart3, 
  AlertCircle, 
  CookingPot, 
  HelpCircle,
  HelpCircleIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "@supabase/supabase-js";
import { 
  WasteEntry, 
  FoodCategory, 
  WasteReason, 
  CATEGORY_METRIC_MAP, 
  ChatMessage 
} from "./types";

// Initialize client-side Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://blzsyikioefpnigzagxn.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_DnL6t56ttULJt9E9ygo7Wg_rs5c9BL2";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'advisor'>('dashboard');

  // Dashboard state
  const [logs, setLogs] = useState<WasteEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Form State
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

  // Advisor Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hello! Feed me your kitchen waste questions! Ask me how to store ingredients to double their lifespan, extract recipes from culinary scraps, or plan a zero-waste grocery run.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Active filter for table logs
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | 'all'>('all');

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

      const mappedData: WasteEntry[] = (data || []).map(item => ({
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
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !weight || !cost || !itemDate) return;

    setIsSubmitting(true);
    try {
      const parsedWeight = parseFloat(weight);
      const parsedCost = parseFloat(cost);
      const metrics = CATEGORY_METRIC_MAP[category];
      const co2Val = Number((parsedWeight * metrics.co2PerLb).toFixed(1));
      const waterVal = Math.round(parsedWeight * metrics.waterPerLb);

      const { error } = await supabase
        .from("household_waste_logs")
        .insert({
          food_name: String(foodName),
          category: String(category),
          weight_lbs: parsedWeight,
          cost_usd: parsedCost,
          discard_date: String(itemDate),
          reason: String(reason),
          co2_impact_lbs: co2Val,
          water_impact_gal: waterVal
        });

      if (error) {
        throw new Error(error.message);
      }

      await fetchLogs();
      
      // Reset form controls
      setFoodName("");
      setWeight("");
      setCost("");
      setFormSuccess(true);
      setTimeout(() => setFormSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving your entry to Supabase: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Log Deletion directly in Supabase
  const handleDeleteLog = async (id: string) => {
    try {
      const { error } = await supabase
        .from("household_waste_logs")
        .delete()
        .eq("id", id);

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
      role: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);
    setApiWarning(null);

    try {
      // Invoke deployed cloud Edge Function "gemini-chat"
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: { query: textToSend }
      });

      if (error) {
        throw new Error(error.message);
      }

      const replyText = typeof data === 'string' ? data : (data?.reply || data || "No response received.");
      const modelMsg: ChatMessage = {
        id: Math.random().toString(),
        role: 'model',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      setApiWarning(err.message || "An error occurred calling the cloud Edge Function.");
    } finally {
      setIsChatLoading(false);
    }
  };

  // Preset prompts for quick education query
  const presetPrompts = [
    { label: "Revive wilted veggies", text: "What is your secret technique for restoring wilted celery, broccoli, and limp carrots?" },
    { label: "Expired milk uses", text: "I have somewhat sour milk that isn't curdled but past the label date. Suggest 3 creative recipes or culinary uses to avoid discarding it." },
    { label: "Banana scrap recipe", text: "Provide a quick, easy eco-recipe for using overripe black bananas and stale sliced bread." },
    { label: "Dates Label Cheat Sheet", text: "Explain simply: What is the difference between Use By, Sell By, and Best Before date stamps?" }
  ];

  // Helper: Fast prefill advisor from category tips
  const askCategoryAdvisor = (cat: FoodCategory) => {
    setActiveTab('advisor');
    const query = `Provide practical storage, life-extension hacks, and recipe ideas specifically for the ${CATEGORY_METRIC_MAP[cat].label} category.`;
    handleSendChatMessage(query);
  };

  // Computational Aggregations for Statistics
  const filteredLogs = logs.filter(item => categoryFilter === 'all' || item.category === categoryFilter);

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
  const maxCategoryValue = Math.max(...(Object.values(costByCategory) as number[]), 1);

  // Reason Frequency count
  const reasonCounts = logs.reduce((acc, item) => {
    acc[item.reason] = (acc[item.reason] || 0) + 1;
    return acc;
  }, {} as Record<WasteReason, number>);

  const totalReasons: number = (Object.values(reasonCounts) as number[]).reduce((s, c) => s + c, 0) || 1;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans antialiased">
      {/* Upper Navigation Header bar */}
      <header id="foodlytics-header" className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Brand Logo Unit */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200/50">
              <Leaf className="h-5 w-5 fill-emerald-100/20" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                Foodlytics
              </h1>
              <p className="text-xs text-stone-500 font-medium">Sustainable household food waste tracker & AI advisor</p>
            </div>
          </div>

          {/* Navigation Control Unit */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200/50">
            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Impact Dashboard
            </button>
            <button
              id="tab-btn-advisor"
              onClick={() => setActiveTab('advisor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'advisor' 
                  ? 'bg-white text-emerald-800 shadow-sm' 
                  : 'text-stone-600 hover:text-stone-950 hover:bg-stone-50'
              }`}
            >
              <Sparkle className="h-4 w-4 text-emerald-600" />
              AI Saved advisor
            </button>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        
        <AnimatePresence mode="wait">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              
              {/* Highlight Stats Strip (Bento-grid like structure) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric Box 1: Cost */}
                <div id="stat-financial-loss" className="bg-white border border-stone-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Financial Loss</span>
                    <h3 className="text-3xl font-bold text-stone-900 font-display">${totalCost.toFixed(2)}</h3>
                    <p className="text-xs text-stone-500">Value of items thrown away</p>
                  </div>
                </div>

                {/* Metric Box 2: Food Weight */}
                <div id="stat-wasted-weight" className="bg-white border border-stone-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <Scale className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Wasted Food Weight</span>
                    <h3 className="text-3xl font-bold text-stone-900 font-display">{totalWeight.toFixed(1)} <span className="text-sm font-medium text-stone-500">lbs</span></h3>
                    <p className="text-xs text-stone-500">Aggregate physical mass lost</p>
                  </div>
                </div>

                {/* Metric Box 3: CO2 Equivalent */}
                <div id="stat-co2-footprint" className="bg-white border border-stone-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Flame className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Carbon Footprint</span>
                    <h3 className="text-3xl font-bold text-stone-900 font-display">{totalCO2.toFixed(1)} <span className="text-sm font-medium text-stone-500">lbs</span></h3>
                    <p className="text-xs text-emerald-800 font-medium">CO2e emissions created</p>
                    <p className="text-[10px] text-stone-400">≈ {Math.round(totalCO2 * 1.1)} miles driven in gas car</p>
                  </div>
                </div>

                {/* Metric Box 4: Ecological Water footprint */}
                <div id="stat-water-footprint" className="bg-white border border-stone-200/60 rounded-2xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Droplet className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Water Footprint</span>
                    <h3 className="text-3xl font-bold text-stone-900 font-display">{totalWater.toLocaleString()} <span className="text-sm font-medium text-stone-500">gal</span></h3>
                    <p className="text-xs text-blue-800 font-medium">Ecological water lost</p>
                    <p className="text-[10px] text-stone-400">≈ {Math.round(totalWater / 17.2)} long hot showers</p>
                  </div>
                </div>

              </div>

              {/* Grid 2: Core Analytics Visualizers & Add Form */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Column A & B (2/3 width) - Charts Panel */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Category Weight & Cost breakdown analysis */}
                  <div id="chart-weight-cost-breakdown" className="bg-white border border-stone-200/60 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-stone-900">Category Contribution Insights</h2>
                        <p className="text-xs text-stone-500">Interactive visual summary breakdown of weight and money wasted</p>
                      </div>
                      <span className="text-xs bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-semibold">
                        {logs.length} Logged Entries
                      </span>
                    </div>

                    {logs.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200/60">
                        <Leaf className="h-8 w-8 stroke-stone-300 mb-2 animate-bounce" />
                        <p className="text-sm">No food waste items logged yet.</p>
                        <p className="text-xs mt-1">Add items using the form to populate analytics!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        
                        {/* Interactive custom Category Weight representation */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-stone-600 uppercase tracking-widest">Weight Wasted by Category (lbs)</span>
                            <span className="text-xs text-stone-400">Hover or click "Tips" to learn dynamic storage preservation techniques</span>
                          </div>
                          
                          <div className="space-y-4">
                            {Object.entries(CATEGORY_METRIC_MAP).map(([key, value]) => {
                              const curWeight = weightByCategory[key as FoodCategory] || 0;
                              const pctOfMax = (curWeight / maxCategoryWeight) * 100;
                              
                              return (
                                <div key={key} className="group flex items-center justify-between gap-4 p-2 rounded-xl hover:bg-stone-50/50 transition-colors duration-150">
                                  <div className="w-1/3 flex items-center gap-3">
                                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: value.color }} />
                                    <span className="text-sm font-semibold text-stone-700 truncate">{value.label}</span>
                                  </div>

                                  {/* Custom dynamic SVG bar representation */}
                                  <div className="flex-1 bg-stone-100 h-3 rounded-full overflow-hidden relative">
                                    <motion.div 
                                      className="h-full rounded-full" 
                                      style={{ backgroundColor: value.color }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${pctOfMax || 0}%` }}
                                      transition={{ duration: 0.8, ease: "easeOut" }}
                                    />
                                  </div>

                                  <div className="w-24 text-right flex items-center justify-end gap-3">
                                    <span className="text-sm font-semibold text-stone-900">{curWeight.toFixed(1)} lbs</span>
                                    <button 
                                      onClick={() => askCategoryAdvisor(key as FoodCategory)}
                                      className="text-xs px-2 py-1 border border-stone-200 rounded hover:bg-white hover:border-emerald-500 hover:text-emerald-700 transition"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-100 text-xs">
                          <div>
                            <span className="font-bold text-stone-600 uppercase block mb-3">Value loss ranking</span>
                            <div className="space-y-2">
                              {Object.entries(CATEGORY_METRIC_MAP)
                                .map(([key, val]) => ({ key, val, cost: costByCategory[key as FoodCategory] || 0 }))
                                .sort((a, b) => b.cost - a.cost)
                                .map((item) => (
                                  <div key={item.key} className="flex justify-between items-center bg-stone-50 px-3 py-1.5 rounded p">
                                    <span className="text-stone-700 font-medium truncate max-w-[140px]">{item.val.label}</span>
                                    <span className="font-bold text-stone-900">${item.cost.toFixed(2)}</span>
                                  </div>
                                ))
                              }
                            </div>
                          </div>

                          <div>
                            <span className="font-bold text-stone-600 uppercase block mb-3">Principal reason of discard</span>
                            
                            <div className="grid grid-cols-5 gap-2 h-16 items-end mt-4">
                              {(['spoiled', 'expired', 'leftover', 'overpurchased', 'other'] as WasteReason[]).map((r) => {
                                const count = reasonCounts[r] || 0;
                                const heightPct = (count / totalReasons) * 100;
                                return (
                                  <div key={r} className="flex flex-col items-center gap-1 group">
                                    {count > 0 && <span className="text-[10px] font-bold text-stone-600">{count}</span>}
                                    <div className="w-full bg-stone-100 hover:bg-stone-200 rounded min-h-[4px] relative" style={{ height: `${Math.max(heightPct, 5)}%` }}>
                                      <div className={`absolute inset-0 rounded ${r === 'spoiled' ? 'bg-amber-400' : r === 'expired' ? 'bg-red-400' : r === 'leftover' ? 'bg-emerald-400' : r === 'overpurchased' ? 'bg-blue-400' : 'bg-stone-400'}`} />
                                    </div>
                                    <span className="text-[9px] font-semibold text-stone-400 uppercase truncate w-full text-center">{r}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>

                      </div>
                    )}

                  </div>

                  {/* Informational Zero-Waste Educational Grid Panel */}
                  <div className="bg-emerald-900/5 rounded-2xl p-6 border border-emerald-900/10 flex flex-col md:flex-row items-center gap-6 justify-between">
                    <div className="space-y-2">
                      <h3 className="text-md font-bold text-emerald-950 flex items-center gap-2">
                        <CookingPot className="h-5 w-5 text-emerald-700" />
                        Did you know?
                      </h3>
                      <p className="text-sm text-emerald-900 leading-relaxed max-w-xl">
                        Almost <strong>40% of all food</strong> gets thrown away at home in the US. Wasted meat generates roughly <strong>9 times</strong> the greenhouse gas emissions per pound than wasted produce due to resources required in animal farming! Learn shelf-saving techniques instantly.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('advisor')}
                      className="shrink-0 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-sm px-5 py-3 rounded-xl flex items-center gap-2 shadow-sm shadow-emerald-900/20 transition-all duration-200 cursor-pointer"
                    >
                      <Sparkle className="h-4 w-4" />
                      Ask AI Advisor
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                </div>

                {/* Column C (1/3 width) - Form Input Panel */}
                <div id="panel-add-log-container" className="bg-white border border-stone-200/60 rounded-2xl p-6 shadow-sm self-start">
                  <div className="mb-6">
                    <h2 className="text-lg font-bold text-stone-900 my-1">Log Food Waste</h2>
                    <p className="text-xs text-stone-500">Log spoiled, expired, or leftover food items to view environmental footprint impact estimates</p>
                  </div>

                  <form onSubmit={handleAddLog} className="space-y-4">
                    
                    {/* Food Name input */}
                    <div className="space-y-1.5">
                      <label htmlFor="food-name" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Food Item Name</label>
                      <input
                        id="food-name"
                        type="text"
                        required
                        placeholder="e.g. Fresh spinach bag, Slices of Cheddar"
                        value={foodName}
                        onChange={(e) => setFoodName(e.target.value)}
                        className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-stone-200 transition-colors"
                      />
                    </div>

                    {/* Category Selector dropdown */}
                    <div className="space-y-1.5">
                      <label htmlFor="food-category" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Category</label>
                      <select
                        id="food-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as FoodCategory)}
                        className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                        <label htmlFor="food-weight" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Weight (lbs)</label>
                        <input
                          id="food-weight"
                          type="number"
                          step="0.01"
                          required
                          min="0.01"
                          placeholder="e.g. 1.2"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="food-cost" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Cost (USD)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-semibold">$</span>
                          <input
                            id="food-cost"
                            type="number"
                            step="0.01"
                            required
                            min="0.01"
                            placeholder="4.99"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            className="w-full pl-8 pr-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Discard Reason input selection */}
                    <div className="space-y-1.5">
                      <label htmlFor="discard-reason" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Primary Reason</label>
                      <select
                        id="discard-reason"
                        value={reason}
                        onChange={(e) => setReason(e.target.value as WasteReason)}
                        className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      <label htmlFor="discard-date" className="text-xs font-bold text-stone-700 uppercase tracking-widest block">Date Thrown Away</label>
                      <input
                        id="discard-date"
                        type="date"
                        required
                        value={itemDate}
                        onChange={(e) => setItemDate(e.target.value)}
                        className="w-full px-4 py-2 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      id="log-submit-btn"
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 mt-2"
                    >
                      {isSubmitting ? (
                        "Adding..."
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Log Entry
                        </>
                      )}
                    </button>

                    {formSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200/50 rounded-xl text-xs text-center font-medium"
                      >
                        Entry logged and ecological impacts updated!
                      </motion.div>
                    )}

                  </form>
                </div>

              </div>

              {/* Dynamic Interactive LOGS TABLE */}
              <div id="logs-history-container" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-stone-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-stone-900">Food Waste Logs & Ecological Impacts</h2>
                    <p className="text-xs text-stone-500">History record of discarded items. Multipliers evaluate resource conservation loss estimation.</p>
                  </div>

                  {/* Log Filter category tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs">
                    <button 
                      onClick={() => setCategoryFilter('all')} 
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${categoryFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
                    >
                      All Logs
                    </button>
                    {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => setCategoryFilter(key as FoodCategory)}
                        className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${categoryFilter === key ? 'bg-white text-stone-950 shadow-xs' : 'text-stone-500 hover:text-stone-900'}`}
                      >
                        <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: val.color }} />
                        {val.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-amber-500/5 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/50">
                        <th className="px-6 py-4">Food Item</th>
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Mass Weight</th>
                        <th className="px-6 py-4">Financial Loss</th>
                        <th className="px-6 py-4">Discard Reason</th>
                        <th className="px-6 py-4">Est. CO2 Output</th>
                        <th className="px-6 py-4">Est. Water Waste</th>
                        <th className="px-6 py-4">Logged Date</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-12 text-center text-stone-400">
                            No logs found matching selection.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((item) => {
                          const catInfo = CATEGORY_METRIC_MAP[item.category];
                          return (
                            <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                              <td className="px-6 py-4 text-stone-900 font-bold">{item.foodName}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${catInfo.color}15`, color: catInfo.color }}>
                                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                                  {catInfo.label}
                                </span>
                              </td>
                              <td className="px-6 py-4">{item.weight} lbs</td>
                              <td className="px-6 py-4 text-red-700">${item.cost.toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`inline-block text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                                  item.reason === 'spoiled' ? 'bg-amber-100 text-amber-800' :
                                  item.reason === 'expired' ? 'bg-red-100 text-red-800' :
                                  item.reason === 'leftover' ? 'bg-emerald-100 text-emerald-800' :
                                  item.reason === 'overpurchased' ? 'bg-blue-100 text-blue-800' :
                                  'bg-stone-100 text-stone-700'
                                }`}>
                                  {item.reason}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-rose-700">{item.co2Impact} lbs</td>
                              <td className="px-6 py-4 font-mono text-xs text-blue-700">{item.waterImpact.toLocaleString()} gal</td>
                              <td className="px-6 py-4 text-stone-500 text-xs">{item.date}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteLog(item.id)}
                                  className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                                  title="Delete historical log"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-stone-50 border-t border-stone-200/50 text-xs text-stone-400 flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-stone-500" />
                  <span>Emissions and water loss metric multipliers estimate production footprints from soil to standard delivery distribution transport models.</span>
                </div>
              </div>

            </motion.div>
          )}

          {/* TAB 2: AI EDUCATION ADVISOR */}
          {activeTab === 'advisor' && (
            <motion.div
              key="advisor-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              
              {/* Left Sidebar Cards: Suggested helper topics */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Advisor Persona Card */}
                <div className="bg-emerald-950 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute right-0 top-0 h-28 w-28 bg-emerald-800 rounded-full blur-3xl opacity-20 -mr-6 -mt-6" />
                  <Sparkle className="h-8 w-8 text-emerald-400 mb-4 animate-pulse" />
                  <h3 className="font-display font-bold text-lg leading-snug">Foodlytics Smart Preservation Advisor</h3>
                  <p className="text-xs text-emerald-250 mt-2 leading-relaxed">
                    Powered by Gemini 3.5 Flash server. Ask anything to maximize shelf-life, craft delicious zero-waste recipes, and understand date stamps!
                  </p>
                </div>

                {/* Grid Preservation Quick Chips */}
                <div className="bg-white border border-stone-200/60 rounded-2xl p-6 shadow-sm">
                  <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">Shortcut Categories</h4>
                  <div className="space-y-2.5 text-xs">
                    {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => {
                          const query = `What are the ultimate preservation tips, storage arrangements, and scrap-cooking recipes for handling food items in the ${val.label} category?`;
                          handleSendChatMessage(query);
                        }}
                        className="w-full p-2.5 rounded-xl border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30 text-stone-700 hover:text-stone-90 w-full flex items-center justify-between text-left font-medium transition duration-150"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: val.color }} />
                          {val.label.split(" (")[0]}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Practical storage checklist mini card */}
                <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-6 text-xs text-amber-900 space-y-3">
                  <span className="font-bold flex items-center gap-1">
                    <Info className="h-4 w-4" />
                    Kitchen Quick-Save Win
                  </span>
                  <p className="leading-relaxed">
                    <strong>Tomatoes:</strong> Store at room temp away from sunlight, stem-side down to prevent rotting.
                  </p>
                  <p className="leading-relaxed">
                    <strong>Herb Bundles:</strong> Trim stems, place in water glasses (like flowers), and cover loosely with a reusable bag.
                  </p>
                </div>

              </div>

              {/* Central Column Chat Interface (3/4 width) */}
              <div className="lg:col-span-3 bg-white border border-stone-200/60 rounded-2xl shadow-sm h-[680px] flex flex-col overflow-hidden">
                
                {/* Chat Top header info */}
                <div className="px-6 py-4 border-b border-stone-200/40 bg-stone-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-display text-sm">
                      AI
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Education Preservation Chat</h3>
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                        Online & Ready to consult
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setChatMessages([
                      {
                        id: "welcome",
                        role: "model",
                        text: "Hello! Feed me your kitchen waste questions! Ask me how to store ingredients to double their lifespan, extract recipes from culinary scraps, or plan a zero-waste grocery run.",
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      }
                    ])}
                    title="Clear Chat Conversation"
                    className="p-1 px-3 text-xs font-semibold text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 flex items-center gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Clear Chart
                  </button>
                </div>

                {/* Chat Display Logs content (with scroll) */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-emerald-800 text-white rounded-br-none font-medium'
                          : 'bg-stone-50 border border-stone-200/50 text-stone-800 rounded-bl-none'
                      }`}>
                        {/* If model, render with nice structured line breaks manually for markdown support */}
                        <div className="whitespace-pre-line space-y-2">
                          {msg.text}
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-semibold mt-1 px-1">{msg.timestamp}</span>
                    </div>
                  ))}

                  {isChatLoading && (
                    <div className="flex flex-col items-start max-w-[80%]">
                      <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/30 text-stone-500 rounded-bl-none text-xs flex items-center gap-3">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" />
                        </div>
                        <span>Foodlytics Guru is analyzing sustainability guides...</span>
                      </div>
                    </div>
                  )}

                  {apiWarning && (
                    <div className="p-3 bg-red-50 border border-red-200/40 text-red-800 rounded-xl text-xs flex items-start gap-2 max-w-[85%]">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <div>
                        <span className="font-bold">Advisor Lookup issue:</span> {apiWarning}
                        <p className="mt-1 font-medium text-stone-500">Please make sure a realistic Gemini API key is configured in your project Secrets.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preset Fast Prompts suggestions */}
                <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">Preset Quick Inquiries</span>
                  <div className="flex flex-wrap gap-2">
                    {presetPrompts.map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendChatMessage(p.text)}
                        disabled={isChatLoading}
                        className="px-3 py-1.5 bg-white border border-stone-200/50 hover:border-emerald-500 text-stone-600 hover:text-emerald-800 rounded-lg text-xs font-semibold cursor-pointer select-none transition disabled:opacity-50"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input message form controls */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendChatMessage(chatInput);
                  }}
                  className="p-4 border-t border-stone-250/30 bg-white flex items-center gap-3"
                >
                  <input
                    id="chat-user-input"
                    type="text"
                    required
                    placeholder="Ask Advisor about proper storage, recipes from leftovers, expiration dates..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    disabled={isChatLoading}
                    className="flex-1 px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 font-semibold text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    id="chat-send-btn"
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="h-11 w-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shrink-0 transition shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </form>

              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Sustainable footer summary */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-stone-200/50 text-center text-xs text-stone-400 font-semibold space-y-1 mt-12 bg-white rounded-t-3xl">
        <p>Foodlytics Dashboard Application — Cultivating ecological mindfulness one home kitchen at a time.</p>
        <p className="text-stone-300 font-medium">Calculations based on USDA and FAO household wastage benchmarks.</p>
      </footer>
    </div>
  );
}
