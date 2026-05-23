"use client";

import React, { useRef, useEffect } from "react";
import { Sparkles, ChevronRight, RotateCcw, Send, AlertCircle, Info, Bot, User, HelpCircle } from "lucide-react";
import { FoodCategory, ChatMessage, CATEGORY_METRIC_MAP } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";

interface AdvisorChatProps {
  chatMessages: ChatMessage[];
  chatInput: string;
  isChatLoading: boolean;
  apiWarning: string | null;
  onSetChatInput: (val: string) => void;
  onSendChatMessage: (text: string) => Promise<void>;
  onClearChat: () => void;
}

export function AdvisorChat({
  chatMessages,
  chatInput,
  isChatLoading,
  apiWarning,
  onSetChatInput,
  onSendChatMessage,
  onClearChat,
}: AdvisorChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Preset prompts
  const presetPrompts = [
    {
      label: "Revive wilted produce",
      text: "What is your secret technique for restoring wilted celery, broccoli, and limp carrots?",
    },
    {
      label: "Sour milk culinary hacks",
      text: "I have somewhat sour milk that isn't curdled but past the label date. Suggest 3 creative recipes or culinary uses to avoid discarding it.",
    },
    {
      label: "Banana scrap recipe",
      text: "Provide a quick, easy eco-recipe for using overripe black bananas and stale sliced bread.",
    },
    {
      label: "Dates Label Cheat Sheet",
      text: "Explain simply: What is the difference between Use By, Sell By, and Best Before date stamps?",
    },
  ];

  const handlePresetClick = (text: string) => {
    onSendChatMessage(text);
  };

  const handleShortcutClick = (label: string) => {
    const query = `What are the ultimate preservation tips, storage arrangements, and scrap-cooking recipes for handling food items in the ${label} category?`;
    onSendChatMessage(query);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    onSendChatMessage(chatInput);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Left Sidebar Cards: Suggested helper topics */}
      <div className="lg:col-span-1 space-y-6">
        {/* Advisor Persona Card */}
        <Card className="glass-panel border-none rounded-2xl shadow-xl relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-emerald-900/10">
          <CardContent className="p-6">
            <div className="absolute right-0 top-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl -mr-6 -mt-6" />
            <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 mb-4 shadow-inner">
              <Bot className="h-5 w-5" />
            </div>
            <h3 className="font-display font-extrabold text-base text-white leading-snug flex items-center gap-1.5">
              Preservation Advisor
            </h3>
            <p className="text-xs text-stone-400 mt-2.5 leading-relaxed font-bold">
              Powered by Deno Cloud Edge Functions & Gemini 3.5 Flash. Ask operational preservation guides or custom leftover recipes.
            </p>
          </CardContent>
        </Card>

        {/* Grid Preservation Quick Chips */}
        <Card className="glass-panel border-none rounded-2xl shadow-xl overflow-hidden">
          <CardContent className="p-6">
            <h4 className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-emerald-400" />
              Shortcut Topics
            </h4>
            
            <div className="space-y-2 text-xs">
              {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleShortcutClick(val.label)}
                  disabled={isChatLoading}
                  className="w-full p-2.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 text-stone-300 hover:text-white flex items-center justify-between text-left font-bold transition duration-200 cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span className="h-2 w-2 rounded-full inline-block shrink-0 shadow-sm" style={{ backgroundColor: val.color }} />
                    <span className="truncate">{val.label.split(" (")[0]}</span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-stone-500 shrink-0" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Practical storage checklist mini card */}
        <div className="glass-panel border-none rounded-2xl p-6 text-xs text-amber-300 space-y-3.5 font-bold shadow-xl">
          <span className="font-bold flex items-center gap-1.5 text-amber-250 text-amber-200">
            <Info className="h-4.5 w-4.5 text-amber-400" />
            Kitchen Quick-Save Win
          </span>
          <p className="leading-relaxed font-semibold text-stone-350 text-stone-300">
            <strong>Tomatoes:</strong> Store at room temp away from sunlight, stem-side down to prevent rotting.
          </p>
          <p className="leading-relaxed font-semibold text-stone-350 text-stone-300">
            <strong>Herb Bundles:</strong> Trim stems, place in water glasses (like flowers), and cover loosely with a reusable bag.
          </p>
        </div>
      </div>

      {/* Central Column Chat Interface (3/4 width) */}
      <Card className="lg:col-span-3 glass-panel border-none rounded-2xl shadow-xl h-[680px] flex flex-col overflow-hidden">
        {/* Chat Top header info */}
        <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm shadow-inner">
              AI
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                Preservation Advisor Console
              </h3>
              <div className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-455 bg-emerald-500 inline-block animate-ping" />
                Cloud sync active & online
              </div>
            </div>
          </div>

          <button
            onClick={onClearChat}
            title="Clear Chat Conversation"
            className="p-1.5 px-3.5 text-xs font-extrabold text-stone-400 hover:text-white rounded-xl bg-white/5 border border-white/10 hover:border-white/20 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Chat
          </button>
        </div>

        {/* Chat Display Logs content (with scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-black/10">
          <AnimatePresence initial={false}>
            {chatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col max-w-[85%] ${
                  msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                {(() => {
                  let cleanText = msg.text;
                  let sourcesList: Array<{ source_doc: string; chunk_id: string }> = [];

                  const sourcesMatch = msg.text.match(/```sources\n([\s\S]*?)\n```/);
                  if (sourcesMatch) {
                    try {
                      sourcesList = JSON.parse(sourcesMatch[1]);
                      cleanText = msg.text.replace(/```sources\n[\s\S]*?\n```/, "").trim();
                    } catch (e) {
                      // ignore parse error
                    }
                  }

                  return (
                    <>
                      <div
                        className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                          msg.role === "user"
                            ? "bg-emerald-600/25 border-emerald-500/30 text-emerald-250 text-stone-100 rounded-br-none font-bold"
                            : "bg-white/[0.03] border-white/5 text-stone-250 text-stone-200 rounded-bl-none font-semibold"
                        }`}
                      >
                        <div className="whitespace-pre-line space-y-2">{cleanText}</div>

                        {/* Citations block */}
                        {sourcesList.length > 0 && (
                          <div className="mt-3.5 pt-2.5 border-t border-white/5 space-y-1.5 text-[10px]">
                            <span className="text-stone-500 font-bold uppercase tracking-wider block">Grounded Citations:</span>
                            <div className="flex flex-wrap gap-2">
                              {sourcesList.map((src, sIdx) => (
                                <span 
                                  key={sIdx}
                                  title={`Document: ${src.source_doc} // Chunk: ${src.chunk_id}`}
                                  className="px-2 py-0.5 bg-white/5 border border-white/10 hover:border-emerald-500/20 text-stone-400 hover:text-white rounded-lg cursor-help transition-all flex items-center gap-1 font-mono font-bold"
                                >
                                  📄 {src.source_doc.replace('ZeroWaste_', '').replace('.txt', '')} ({src.chunk_id.replace('chunk_', 'C')})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
                <span className="text-[9px] text-stone-500 font-bold mt-1 px-1">{msg.timestamp}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {isChatLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-start max-w-[80%]"
            >
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-stone-400 rounded-bl-none text-xs flex items-center gap-3 font-bold">
                <div className="flex gap-1.5 shrink-0">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce" />
                </div>
                <span>Advisor is scanning sustainability guides...</span>
              </div>
            </motion.div>
          )}

          {apiWarning && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-xs flex items-start gap-2.5 max-w-[85%] font-bold">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5 animate-pulse" />
              <div>
                <span className="font-extrabold text-white">Advisor Query Issue:</span> {apiWarning}
                <p className="mt-1 font-medium text-stone-400">
                  Make sure that the Vercel or cloud secrets correctly contain your authorized Gemini key.
                </p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Preset Fast Prompts suggestions */}
        <div className="px-6 py-3.5 border-t border-white/5 bg-white/[0.01] shrink-0">
          <span className="text-[9px] font-extrabold text-stone-400 uppercase tracking-widest block mb-2">
            Preset Quick Inquiries
          </span>
          
          <div className="flex flex-wrap gap-2">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(p.text)}
                disabled={isChatLoading}
                className="px-3.5 py-2 bg-white/5 border border-white/10 hover:border-emerald-500/50 text-stone-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer select-none transition disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input message form controls */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/5 bg-white/[0.02] flex items-center gap-3 shrink-0">
          <Input
            id="chat-user-input"
            type="text"
            required
            placeholder="Ask Advisor how to store items, cut down waste, or preserve food..."
            value={chatInput}
            onChange={(e) => onSetChatInput(e.target.value)}
            disabled={isChatLoading}
            className="flex-1 px-4 py-3 bg-black/35 border border-white/10 focus:border-emerald-500/50 rounded-xl font-bold text-sm text-stone-250 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-emerald-500 h-11"
          />
          <Button
            id="chat-send-btn"
            type="submit"
            disabled={isChatLoading || !chatInput.trim()}
            className="h-11 w-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 border border-emerald-500/20 hover:border-emerald-450 transition shadow-md disabled:opacity-50 cursor-pointer p-0"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
