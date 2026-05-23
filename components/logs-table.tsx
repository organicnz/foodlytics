"use client";

import React, { useState } from "react";
import { Info, Trash2 } from "lucide-react";
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

  const filteredLogs = logs.filter(
    (item) => categoryFilter === "all" || item.category === categoryFilter
  );

  return (
    <Card id="logs-history-container" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-6 border-b border-stone-200/50 flex flex-col md:flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-lg font-bold text-stone-900">
            Food Waste Logs & Ecological Impacts
          </CardTitle>
          <CardDescription className="text-xs text-stone-500 mt-1">
            History record of discarded items. Multipliers evaluate resource conservation loss estimation.
          </CardDescription>
        </div>

        {/* Log Filter category tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl text-xs self-start md:self-center">
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
              categoryFilter === "all"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-500 hover:text-stone-900"
            }`}
          >
            All Logs
          </button>
          {Object.entries(CATEGORY_METRIC_MAP).map(([key, val]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key as FoodCategory)}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                categoryFilter === key
                  ? "bg-white text-stone-950 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: val.color }} />
              {val.label.split(" ")[0]}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="w-full text-left text-sm">
            <TableHeader>
              <TableRow className="bg-amber-500/5 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/50 hover:bg-transparent">
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Food Item</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Category</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Mass Weight</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Financial Loss</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Discard Reason</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Est. CO2 Output</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Est. Water Waste</TableHead>
                <TableHead className="px-6 py-4 font-semibold text-stone-500">Logged Date</TableHead>
                <TableHead className="px-6 py-4 text-right font-semibold text-stone-500">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-stone-100 font-semibold">
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="px-6 py-12 text-center text-stone-400">
                    No logs found matching selection.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((item) => {
                  const catInfo = CATEGORY_METRIC_MAP[item.category];
                  return (
                    <TableRow key={item.id} className="hover:bg-stone-50/70 transition-colors">
                      <TableCell className="px-6 py-4 text-stone-900 font-bold">{item.foodName}</TableCell>
                      <TableCell className="px-6 py-4">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: `${catInfo.color}15`, color: catInfo.color }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: catInfo.color }} />
                          {catInfo.label.split(" (")[0]}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-stone-800 font-medium font-mono">{item.weight} lbs</TableCell>
                      <TableCell className="px-6 py-4 text-rose-700 font-bold font-mono">${item.cost.toFixed(2)}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                            item.reason === "spoiled"
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : item.reason === "expired"
                              ? "bg-rose-100 text-rose-800 hover:bg-rose-100"
                              : item.reason === "leftover"
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                              : item.reason === "overpurchased"
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {item.reason}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-rose-700">{item.co2Impact} lbs</TableCell>
                      <TableCell className="px-6 py-4 font-mono text-xs text-blue-700">
                        {item.waterImpact.toLocaleString()} gal
                      </TableCell>
                      <TableCell className="px-6 py-4 text-stone-500 text-xs font-mono">{item.date}</TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <button
                          onClick={() => onDeleteLog(item.id)}
                          className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Delete historical log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-200/50 text-xs text-stone-400 flex items-center gap-2 font-medium">
          <Info className="h-4 w-4 shrink-0 text-stone-500" />
          <span>
            Emissions and water loss metric multipliers estimate production footprints from soil to standard delivery distribution transport models.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
