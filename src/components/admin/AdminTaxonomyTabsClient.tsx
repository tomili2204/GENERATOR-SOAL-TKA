"use client";

import React, { useState } from "react";
import { Bookmark, Sparkles } from "lucide-react";
import { FixedTaxonomy, TemaKonteksPoolItem } from "@/db/schema";
import { TaxonomyManagementView } from "./TaxonomyManagementView";
import { TemaKonteksPoolView } from "./TemaKonteksPoolView";

interface AdminTaxonomyTabsClientProps {
  initialTaxonomies: FixedTaxonomy[];
  initialThemes: TemaKonteksPoolItem[];
}

export function AdminTaxonomyTabsClient({
  initialTaxonomies,
  initialThemes,
}: AdminTaxonomyTabsClientProps) {
  const [activeTab, setActiveTab] = useState<"taxonomy" | "themes">("taxonomy");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-2 pt-2 gap-1 overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab("taxonomy")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "taxonomy"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
          }`}
        >
          <Bookmark className="w-4 h-4 text-indigo-600" />
          Taksonomi Kurikulum (Elemen & Mapel)
        </button>

        <button
          onClick={() => setActiveTab("themes")}
          className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === "themes"
              ? "border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg"
              : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Pool Tema Konteks AI (Variasi Cerita)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "taxonomy" && (
        <TaxonomyManagementView initialTaxonomies={initialTaxonomies} />
      )}

      {activeTab === "themes" && (
        <TemaKonteksPoolView initialThemes={initialThemes} />
      )}
    </div>
  );
}
