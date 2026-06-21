"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";

export default function AiCfoPage() {
  const [question, setQuestion] = useState("Which customers should collections focus on this week?");
  const history = useQuery({ queryKey: ["ai-cfo-history"], queryFn: () => api.get<any[]>("/ai-cfo/history") });
  const ask = useMutation({ mutationFn: () => api.post<any>("/ai-cfo/ask", { question }), onSuccess: () => history.refetch() });

  return (
    <>
      <PageHeader title="AI CFO" description="Grounded business Q&A using tenant-scoped FinOS data only." />
      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Panel>
          <PanelHeader title="Ask a Business Question" />
          <div className="grid gap-3 p-4">
            <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} />
            <div className="flex gap-2">
              {["Explain cashflow", "Show collection priorities", "Explain credit risk", "Summarize revenue"].map((prompt) => (
                <Button key={prompt} variant="outline" size="sm" onClick={() => setQuestion(prompt)}>{prompt}</Button>
              ))}
            </div>
            <Button className="w-fit" disabled={ask.isPending} onClick={() => ask.mutate()}>
              <Send className="h-4 w-4" />
              {ask.isPending ? "Thinking" : "Ask AI CFO"}
            </Button>
            {ask.data ? (
              <div className="rounded-md border border-border bg-muted/50 p-4">
                <div className="mb-2 flex items-center gap-2"><Badge>Confidence {Number(ask.data.confidence ?? 0).toFixed(2)}</Badge></div>
                <p className="text-sm leading-6">{ask.data.content}</p>
                <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                  {(ask.data.citations ?? []).map((citation: any) => (
                    <span key={citation.metric}>{citation.metric}: {String(citation.value)}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recent AI CFO Threads" />
          <div className="grid gap-2 p-3">
            {(history.data ?? []).map((thread) => (
              <div key={thread.id} className="rounded-md border border-border p-3">
                <div className="text-sm font-medium">{thread.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{thread.messages?.at(-1)?.content?.slice(0, 130)}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
