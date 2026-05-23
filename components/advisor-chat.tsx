"use client";

import React, { useRef, useEffect } from "react";
import { Sparkle, ChevronRight, RotateCcw, Send, AlertCircle, Info } from "lucide-react";
import { FoodCategory, ChatMessage, CATEGORY_METRIC_MAP } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      label: "Revive wilted veggies",
      text: "What is your secret technique for restoring wilted celery, broccoli, and limp carrots?",
    },
    {
      label: "Expired milk uses",
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
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Left Sidebar Cards: Suggested helper topics */}
      <div className="lg:col-span-1 space-y-6">
        {/* Advisor Persona Card */}
        <Card className="bg-emerald-950 text-white rounded-2xl shadow-sm relative overflow-hidden border-none">
          <CardContent className="p-6">
            <div className="absolute right-0 top-0 h-28 w-28 bg-emerald-800 rounded-full blur-3xl opacity-20 -mr-6 -mt-6" />
            <Sparkle className="h-8 w-8 text-emerald-400 mb-4 animate-pulse" />
            <h3 className="font-display font-bold text-lg leading-snug">
              Foodlytics Smart Preservation Advisor
            </h3>
            <p className="text-xs text-emerald-100/80 mt-2 leading-relaxed font-medium">
              Powered by Gemini 3.5 Flash server. Ask anything to maximize shelf-life, craft delicious zero-waste recipes, and understand date stamps!
            </p>
          </CardContent>
        </Card>

        {/* Grid Preservation Quick Chips */}
        <Card className="bg-white border border-stone-200/60 rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-4">
              Shortcut Categories
            </h4>
            <div className="space-y-2.5 text-xs">
              {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => handleShortcutClick(val.label)}
                  disabled={isChatLoading}
                  className="w-full p-2.5 rounded-xl border border-stone-100 hover:border-emerald-200 hover:bg-emerald-50/30 text-stone-700 hover:text-stone-90 flex items-center justify-between text-left font-semibold transition duration-150 cursor-pointer disabled:opacity-50"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: val.color }} />
                    {val.label.split(" (")[0]}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Practical storage checklist mini card */}
        <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-6 text-xs text-amber-900 space-y-3 font-semibold">
          <span className="font-bold flex items-center gap-1.5 text-amber-950">
            <Info className="h-4 w-4 text-amber-700" />
            Kitchen Quick-Save Win
          </span>
          <p className="leading-relaxed font-medium text-amber-800">
            <strong>Tomatoes:</strong> Store at room temp away from sunlight, stem-side down to prevent rotting.
          </p>
          <p className="leading-relaxed font-medium text-amber-800">
            <strong>Herb Bundles:</strong> Trim stems, place in water glasses (like flowers), and cover loosely with a reusable bag.
          </p>
        </div>
      </div>

      {/* Central Column Chat Interface (3/4 width) */}
      <Card className="lg:col-span-3 bg-white border border-stone-200/60 rounded-2xl shadow-sm h-[680px] flex flex-col overflow-hidden">
        {/* Chat Top header info */}
        <div className="px-6 py-4 border-b border-stone-200/40 bg-stone-50/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-display text-sm">
              AI
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Education Preservation Chat</h3>
              <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-ping" />
                Online & Ready to consult
              </div>
            </div>
          </div>

          <button
            onClick={onClearChat}
            title="Clear Chat Conversation"
            className="p-1 px-3 text-xs font-bold text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Chat Display Logs content (with scroll) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
              }`}
            >
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-emerald-800 text-white rounded-br-none font-semibold"
                    : "bg-stone-50 border border-stone-200/50 text-stone-800 rounded-bl-none font-medium"
                }`}
              >
                <div className="whitespace-pre-line space-y-2">{msg.text}</div>
              </div>
              <span className="text-[10px] text-stone-400 font-bold mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {isChatLoading && (
            <div className="flex flex-col items-start max-w-[80%]">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/30 text-stone-500 rounded-bl-none text-xs flex items-center gap-3 font-semibold">
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
            <div className="p-3 bg-red-50 border border-red-200/40 text-red-800 rounded-xl text-xs flex items-start gap-2 max-w-[85%] font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <span className="font-bold">Advisor Lookup issue:</span> {apiWarning}
                <p className="mt-1 font-medium text-stone-500">
                  Please make sure a realistic Gemini API key is configured in your project Secrets.
                </p>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Preset Fast Prompts suggestions */}
        <div className="px-6 py-3 border-t border-stone-100 bg-stone-50/50">
          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">
            Preset Quick Inquiries
          </span>
          <div className="flex flex-wrap gap-2">
            {presetPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePresetClick(p.text)}
                disabled={isChatLoading}
                className="px-3 py-1.5 bg-white border border-stone-200/50 hover:border-emerald-500 text-stone-600 hover:text-emerald-850 hover:bg-stone-50 rounded-lg text-xs font-bold cursor-pointer select-none transition disabled:opacity-50"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input message form controls */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-stone-200/40 bg-white flex items-center gap-3">
          <Input
            id="chat-user-input"
            type="text"
            required
            placeholder="Ask Advisor about proper storage, recipes from leftovers, expiration dates..."
            value={chatInput}
            onChange={(e) => onSetChatInput(e.target.value)}
            disabled={isChatLoading}
            className="flex-1 px-4 py-3 border border-stone-200 rounded-xl bg-stone-50 font-bold text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 h-11"
          />
          <Button
            id="chat-send-btn"
            type="submit"
            disabled={isChatLoading || !chatInput.trim()}
            className="h-11 w-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shrink-0 transition shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer p-0"
          >
            <Send className="h-4.5 w-4.5" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
