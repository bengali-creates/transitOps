"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Play, Check, X, Loader2, AlertCircle, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { dispatchTripAction } from "@/server/actions/trips";

interface StepTrace {
  role: string;
  content: string;
  name?: string;
  tool_id?: string;
  tool_calls?: any[];
}

export function AgentPlanPanel() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [goal, setGoal] = React.useState("");
  const [cargoWeight, setCargoWeight] = React.useState("800");
  const [region, setRegion] = React.useState("North");
  const [steps, setSteps] = React.useState<StepTrace[]>([]);
  const [finalPlan, setFinalPlan] = React.useState<string | null>(null);
  const [draftTripId, setDraftTripId] = React.useState<string | null>(null);
  const [confidence, setConfidence] = React.useState<number | null>(null);

  const { mutate: generatePlan, isPending } = useMutation({
    mutationFn: async () => {
      setSteps([]);
      setFinalPlan(null);
      setDraftTripId(null);
      setConfidence(null);

      const res = await fetch("/api/ai/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal,
          cargoWeight: Number(cargoWeight),
          region: region || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Agent planning failed");
      }

      const data = await res.json();
      return data;
    },
    onSuccess: (data) => {
      setSteps(data.steps || []);
      setFinalPlan(data.plan || null);
      setConfidence(data.confidence || null);

      // Extract draft trip ID from final plan or steps trace
      const tripIdMatch = data.plan?.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || 
                          JSON.stringify(data.steps).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (tripIdMatch) {
        setDraftTripId(tripIdMatch[0]);
      }
      toast.success("AI Agent generated dispatch plan successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Something went wrong during agent execution");
    },
  });

  const handleAccept = async () => {
    if (!draftTripId) return;
    try {
      await dispatchTripAction(draftTripId);
      toast.success("Draft trip dispatched successfully!");
      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch trip");
    }
  };

  const handleDiscard = () => {
    setGoal("");
    setSteps([]);
    setFinalPlan(null);
    setDraftTripId(null);
    setConfidence(null);
    toast.info("Agentic plan discarded.");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 border border-dashed flex items-center justify-center gap-1.5 py-4">
          <Bot className="w-4 h-4 animate-bounce" />
          <span>🤖 Auto-Plan with AI Agent</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <DialogTitle>Agentic Dispatch Planner</DialogTitle>
          </div>
          <DialogDescription>
            Enter your operational goals in plain English. The agent will run a recursive loop to verify vehicle weights, driver licenses, precomputed routes, and draft the trip.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="space-y-1.5">
            <Label htmlFor="goal">Dispatch Goal</Label>
            <Textarea
              id="agent-goal-input"
              placeholder="e.g. Move 800 kg of cargo from Ahmedabad Hub West to Surat Logistics South as fast as possible."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isPending}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cargo-weight">Cargo Weight (kg)</Label>
              <Input
                id="agent-weight-input"
                type="number"
                value={cargoWeight}
                onChange={(e) => setCargoWeight(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Preferred Region</Label>
              <Input
                id="agent-region-input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="e.g. North, West"
                disabled={isPending}
              />
            </div>
          </div>

          <Button
            id="agent-run-plan"
            onClick={() => generatePlan()}
            disabled={isPending || !goal.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Agent executing ReAct loop...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run Agentic Solver</span>
              </>
            )}
          </Button>

          {/* Steps Trace Accordion */}
          {steps.length > 0 && (
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="bg-muted/50 px-3 py-2 border-b flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Agent Execution Trace (ReAct Loop)</span>
                {confidence !== null && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Confidence: {(confidence * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <div className="p-3 space-y-3 max-h-[220px] overflow-y-auto text-xs font-mono scrollbar-thin">
                {steps.map((step, idx) => (
                  <div key={idx} className="space-y-1 border-l-2 border-primary/20 pl-2">
                    <span className="text-[10px] font-semibold text-primary uppercase">
                      Step {idx + 1}: {step.role}
                    </span>
                    {step.tool_calls && (
                      <div className="text-indigo-600 dark:text-indigo-400">
                        🔨 Tool Call: <strong className="font-bold">{step.tool_calls[0]?.name}</strong>({JSON.stringify(step.tool_calls[0]?.args)})
                      </div>
                    )}
                    {step.content && (
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{step.content}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Plan Output */}
          {finalPlan && (
            <div className="p-4 border border-emerald-500/20 rounded-xl bg-emerald-500/5 space-y-3">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Recommended Dispatch Plan</span>
              </h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground font-sans">
                {finalPlan}
              </p>
              {draftTripId && (
                <div className="text-xs bg-muted border p-2 rounded-lg flex items-center justify-between gap-2">
                  <div className="truncate">
                    <span className="font-semibold">Draft Trip ID:</span> <code className="bg-background px-1.5 py-0.5 rounded border text-[11px] font-mono">{draftTripId}</code>
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px] tracking-wide font-semibold">
                    Uncommitted Draft
                  </Badge>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          {finalPlan && draftTripId ? (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={handleDiscard} className="w-full sm:w-auto">
                <X className="w-4 h-4 mr-1.5" /> Discard Plan
              </Button>
              <Button onClick={handleAccept} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                <Check className="w-4 h-4 mr-1.5" /> Accept & Dispatch
              </Button>
            </div>
          ) : (
            <Button variant="ghost" onClick={() => setIsOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
