"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = "",
}: TablePaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600 ${className}`}
    >
      {/* Kiri: Pilihan Page Size & Summary */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Baris per halaman:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
            }}
            className="h-8 px-2.5 py-1 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Menampilkan <span className="font-semibold text-slate-800">{startItem}</span> -{" "}
          <span className="font-semibold text-slate-800">{endItem}</span> dari{" "}
          <span className="font-semibold text-slate-800">{totalItems}</span> data
        </div>
      </div>

      {/* Kanan: Navigasi Halaman */}
      <div className="flex items-center gap-1">
        {/* Tombol First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="Halaman Pertama"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Tombol Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Halaman Sebelumnya"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Nomor Halaman */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === "string") {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-mono">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[30px] h-8 px-2 text-xs font-mono font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm font-semibold"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Tombol Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="Halaman Berikutnya"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Tombol Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || totalPages === 0}
          title="Halaman Terakhir"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
