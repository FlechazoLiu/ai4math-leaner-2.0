"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { create } from "@bufbuild/protobuf";
import {
  AssignmentQuestion,
  ListAssignmentQuestionsRequestSchema,
  ListAssignmentAnswersRequestSchema,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listAssignmentQuestions,
  listAssignmentAnswers,
} from "@/lib/grpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  Star,
} from "lucide-react";
import Link from "next/link";

function ProgressBar({ graded, total }: { graded: number; total: number }) {
  const pct = total > 0 ? Math.round((graded / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full transition-all ${
          pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-300"
        }`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
        {graded}/{total} ({pct}%)
      </span>
    </div>
  );
}

export default function AssignmentGradePage() {
  const { data: session } = useSession();
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const canReview = session?.user?.role && [1, 2, 3].includes(session.user.role);

  const [questions, setQuestions] = useState<AssignmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<Record<string, { total: number; graded: number }>>({});

  useEffect(() => {
    if (canReview && session?.user?.token) loadQuestions();
  }, [session, canReview, assignmentId]);

  const loadQuestions = async () => {
    if (!session?.user?.token) return;
    setLoading(true);
    try {
      const qResp = await listAssignmentQuestions(create(ListAssignmentQuestionsRequestSchema, {
        assignmentId, userToken: session.user.token, pageSize: 100, pageToken: "1",
      }));
      setQuestions(qResp.questions);

      // Load answers for all questions to compute progress
      if (qResp.questions.length > 0) {
        const results = await Promise.all(
          qResp.questions.map(q =>
            listAssignmentAnswers(create(ListAssignmentAnswersRequestSchema, {
              assignmentQuestionId: q.id, userToken: session.user.token,
              excludeDrafts: true, pageSize: 500, pageToken: "1",
            }))
            .then(r => ({
              qid: q.id,
              total: r.answers.length,
              graded: r.answers.filter(a => a.grades && a.grades.length > 0).length,
            }))
            .catch(() => ({ qid: q.id, total: 0, graded: 0 }))
          )
        );
        const p: Record<string, { total: number; graded: number }> = {};
        for (const r of results) p[r.qid] = { total: r.total, graded: r.graded };
        setProgress(p);
      }
    } catch (e) {
      console.error("Error loading questions:", e);
    } finally {
      setLoading(false);
    }
  };

  const totalAll = Object.values(progress).reduce((s, p) => s + p.total, 0);
  const gradedAll = Object.values(progress).reduce((s, p) => s + p.graded, 0);

  if (!canReview) {
    return (
      <div className="container mx-auto py-8">
        <Card><CardContent className="py-8 text-center">
          <h2 className="text-xl font-semibold">Access Denied</h2>
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/review"><ArrowLeft className="h-4 w-4 mr-1" />Back</Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade Assignment</h1>
        </div>
        {questions.length > 0 && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
            {gradedAll}/{totalAll} graded
          </Badge>
        )}
      </div>

      {/* Questions list */}
      {loading ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Loading questions...</CardContent></Card>
      ) : questions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No questions found</p>
          <p className="text-sm mt-1">This assignment has no questions yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {questions.map(q => {
            const p = progress[q.id] || { total: 0, graded: 0 };
            return (
              <Card key={q.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{q.title}</h3>
                  </div>
                  <div className="w-48">
                    <ProgressBar graded={p.graded} total={p.total} />
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/review/grade/${q.id}`}>
                      Grade <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
