"use client";

import React, { useState } from "react";
import { Info, Trash2, SlidersHorizontal, Database } from "lucide-react";
import { FoodCategory, CATEGORY_METRIC_MAP, WasteEntry } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LogsTableProps {
  logs: WasteEntry[];
  onDeleteLog: (id: string) => Promise<void>;
}

export function LogsTable({ logs, onDeleteLog }: LogsTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | "all">("all");
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const filteredLogs = logs.filter(
    (item) => categoryFilter === "all" || item.category === categoryFilter
  );

  const handleDelete = async (id: string) => {
    setIsDeletingId(id);
    try {
      await onDeleteLog(id);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <Card id="logs-history-container" className="glass-panel border-none rounded-2xl shadow-xl overflow-hidden w-full">
      <CardHeader className="p-6 border-b border-white/5 bg-white/[0.02] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-400" />
            Food Waste Logs & Ecological Impacts
          </CardTitle>
          <CardDescription className="text-xs text-stone-400 mt-1">
            Real-time synchronization logs pulled from cloud Supabase table. Ecological loss estimates apply USDA flow benchmarks.
          </CardDescription>
        </div>

        {/* Log Filter category tabs */}
        <div className="flex flex-wrap items-center gap-2 bg-black/20 border border-white/5 p-1 rounded-xl text-xs self-start lg:self-center">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-2 rounded-lg font-extrabold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              categoryFilter === "all"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/20"
                : "text-stone-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" />
            All Logs
          </button>
          
          {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key as FoodCategory)}
              className={`px-3 py-2 rounded-lg font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer border ${
                categoryFilter === key
                  ? "bg-white/10 text-white border-white/20"
                  : "text-stone-400 hover:text-white border-transparent hover:bg-white/5"
              }`}
            >
              <span className="h-2 w-2 rounded-full inline-block shadow-md" style={{ backgroundColor: val.color, boxShadow: `0 0 6px ${val.color}` }} />
              {val.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm border-collapse">
            <TableHeader>
              <TableRow className="bg-white/[0.01] hover:bg-transparent text-stone-400 text-[10px] uppercase tracking-widest font-extrabold border-b border-white/5">
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Food Item</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Category</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Mass Weight</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Financial Loss</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Discard Reason</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400 text-glow-emerald">Est. CO2 Penalty</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Est. Water Waste</TableHead>
                <TableHead className="px-6 py-4 font-bold text-stone-450 text-stone-400">Date Logged</TableHead>
                <TableHead className="px-6 py-4 text-right font-bold text-stone-455 text-stone-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody className="divide-y divide-white/5 font-semibold">
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-6 py-16 text-center text-stone-500 font-bold">
                    No matching records retrieved from Supabase.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((item) => {
                  const catInfo = CATEGORY_METRIC_MAP[item.category];
                  const isDeleting = isDeletingId === item.id;
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-white/[0.02] border-b border-white/5 transition-colors duration-150">
                      <TableCell className="px-6 py-4.5 text-white font-extrabold">{item.foodName}</TableCell>
                      <TableCell className="px-6 py-4.5">
                        <span
                          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border"
                          style={{ 
                            backgroundColor: `${catInfo.color}15`, 
                            borderColor: `${catInfo.color}35`, 
                            color: catInfo.color 
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                          {catInfo.label.split(" (")[0]}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4.5 text-stone-250 text-stone-300 font-bold font-mono">{item.weight} lbs</TableCell>
                      <TableCell className="px-6 py-4.5 text-rose-400 font-extrabold font-mono">${item.cost.toFixed(2)}</TableCell>
                      <TableCell className="px-6 py-4.5">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-md border ${
                            item.reason === "spoiled"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
                              : item.reason === "expired"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
                              : item.reason === "leftover"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                              : item.reason === "overpurchased"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/10"
                              : "bg-white/5 text-stone-400 border-white/10 hover:bg-white/5"
                          }`}
                        >
                          {item.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4.5 font-mono text-xs text-emerald-400 font-bold">{item.co2Impact} lbs</TableCell>
                      <TableCell className="px-6 py-4.5 font-mono text-xs text-blue-400 font-bold">
                        {item.waterImpact.toLocaleString()} gal
                      </TableCell>
                      <TableCell className="px-6 py-4.5 text-stone-400 text-xs font-mono">{item.date}</TableCell>
                      <TableCell className="px-6 py-4.5 text-right">
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          className="text-stone-500 hover:text-rose-450 hover:text-rose-400 p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
                          title="Delete database log"
                        >
                          {isDeleting ? (
                            <span className="h-4 w-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin block" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 bg-white/[0.01] border-t border-white/5 text-[11px] text-stone-400 flex items-start gap-2.5 font-semibold">
          <Info className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
          <span>
            Database Integration Check: The dashboard logs table is fully integrated with Supabase RLS policies. Deletions and additions communicate directly to the hosted PostgreSQL environment to ensure persistent storage.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
