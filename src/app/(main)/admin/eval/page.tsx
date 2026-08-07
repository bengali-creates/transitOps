"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";

interface EvalRun {
  id: string;
  metricRecall: string;
  metricPrecision: string;
  metricMrr: string;
  metricNdcg: string;
  metricFaithfulness: string;
  metricRelevance: string;
  runPayload: any;
  createdAt: string;
}

export default function RAGEvalPage() {
  const [runs, setRuns] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  async function fetchRuns() {
    try {
      const res = await fetch("/api/admin/rag/eval");
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load evaluation runs history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRuns();
  }, []);

  async function handleTrigger() {
    setTriggering(true);
    toast.info("Triggered evaluation cycle in the background...");
    try {
      const res = await fetch("/api/admin/rag/eval", { method: "POST" });
      if (res.ok) {
        toast.success("RAG evaluation started. Refreshing dashboard shortly.");
        // Poll for updates in 6 seconds
        setTimeout(() => {
          fetchRuns();
          setTriggering(false);
        }, 6000);
      } else {
        toast.error("Failed to trigger evaluation service.");
        setTriggering(false);
      }
    } catch (err) {
      toast.error("Error communicating with evaluation service.");
      setTriggering(false);
    }
  }

  // Format data for Recharts
  const chartData = [...runs]
    .reverse()
    .map((run, index) => ({
      name: `Run #${index + 1}`,
      Recall: parseFloat(run.metricRecall),
      NDCG: parseFloat(run.metricNdcg),
      Faithfulness: parseFloat(run.metricFaithfulness),
      Relevance: parseFloat(run.metricRelevance),
    }));

  const latestRun = runs[0];

  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              RAG Grounding & Evaluation
            </h1>
            <p className="text-gray-400 mt-1">
              Verify vector retrieval accuracy, answer faithfulness, and guard against hallucinations.
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-700 disabled:to-gray-800 text-white font-medium rounded-lg shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition duration-200"
          >
            {triggering ? "Running Cycle..." : "Run Evaluation Cycle"}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-900 rounded-xl border border-gray-800" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-800 rounded-2xl bg-gray-950">
            <h3 className="text-xl font-semibold text-gray-300">No evaluation runs recorded</h3>
            <p className="text-gray-500 mt-2">Trigger your first evaluation cycle to compute RAG metrics.</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Mean Recall @ 3",
                  val: latestRun.metricRecall,
                  desc: "Evidence presence in top-3 chunks",
                  color: "from-blue-500 to-cyan-500",
                },
                {
                  label: "Mean nDCG",
                  val: latestRun.metricNdcg,
                  desc: "Ranking quality of retrieved context",
                  color: "from-indigo-500 to-purple-500",
                },
                {
                  label: "Faithfulness Score",
                  val: latestRun.metricFaithfulness,
                  desc: "Response groundedness (LLM-as-judge)",
                  color: "from-green-500 to-emerald-500",
                },
                {
                  label: "Answer Relevance",
                  val: latestRun.metricRelevance,
                  desc: "Focus of responses to user queries",
                  color: "from-fuchsia-500 to-pink-500",
                },
              ].map((kpi, idx) => (
                <div
                  key={idx}
                  className="relative group bg-[#13171f] p-6 rounded-2xl border border-gray-800 hover:border-gray-700 transition duration-300 shadow-md"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-900/50 rounded-2xl" />
                  <p className="text-sm font-medium text-gray-400 relative z-10">{kpi.label}</p>
                  <h3 className="text-3xl font-extrabold mt-2 relative z-10 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    {Math.round(parseFloat(kpi.val) * 100)}%
                  </h3>
                  <div className="h-1.5 w-12 bg-gradient-to-r rounded-full mt-3 relative z-10 shadow-sm" style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
                  <p className="text-xs text-gray-500 mt-2 relative z-10">{kpi.desc}</p>
                </div>
              ))}
            </div>

            {/* Performance Over Time Chart */}
            <div className="bg-[#13171f] p-6 rounded-2xl border border-gray-800">
              <h2 className="text-lg font-bold mb-6">Historical Metrics Trend</h2>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222731" />
                    <XAxis dataKey="name" stroke="#687280" />
                    <YAxis domain={[0.5, 1.0]} stroke="#687280" />
                    <Tooltip contentStyle={{ backgroundColor: "#13171f", borderColor: "#222731", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="Recall" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="NDCG" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Faithfulness" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="Relevance" stroke="#ec4899" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Past Runs Table */}
            <div className="bg-[#13171f] rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-lg font-bold">RAG Run Logs</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-950/40 text-xs font-semibold text-gray-400 border-b border-gray-800">
                      <th className="p-4">Date</th>
                      <th className="p-4">Recall</th>
                      <th className="p-4">Precision</th>
                      <th className="p-4">MRR</th>
                      <th className="p-4">nDCG</th>
                      <th className="p-4">Faithfulness</th>
                      <th className="p-4">Relevance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-900/30 transition duration-150">
                        <td className="p-4 text-gray-300 font-medium">
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4 text-blue-400">{Math.round(parseFloat(run.metricRecall) * 100)}%</td>
                        <td className="p-4 text-cyan-400">{Math.round(parseFloat(run.metricPrecision) * 100)}%</td>
                        <td className="p-4 text-purple-400">{Math.round(parseFloat(run.metricMrr) * 100)}%</td>
                        <td className="p-4 text-indigo-400">{Math.round(parseFloat(run.metricNdcg) * 100)}%</td>
                        <td className="p-4 text-green-400">{Math.round(parseFloat(run.metricFaithfulness) * 100)}%</td>
                        <td className="p-4 text-pink-400">{Math.round(parseFloat(run.metricRelevance) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
