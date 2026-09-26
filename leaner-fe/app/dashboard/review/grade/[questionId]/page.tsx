"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { create } from "@bufbuild/protobuf";
import {
  AssignmentAnswer,
  AnswerVerificationStatus,
  ListAssignmentAnswersRequestSchema,
  GradeAssignmentAnswerRequestSchema,
  ReturnAssignmentAnswerRequestSchema,
  AssignmentGrade,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listAssignmentAnswers,
  gradeAssignmentAnswer,
  returnAssignmentAnswer,
} from "@/lib/grpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle,
  FileText,
  Code,
  Star,
  RotateCcw,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Lean4CodeBlock } from "@/components/CodeBlock";

function VerificationBadge({ status }: { status: AnswerVerificationStatus }) {
  switch (status) {
    case AnswerVerificationStatus.SUCCESSFUL:
      return <Badge className="bg-green-100 text-green-700 border-green-300">Verified</Badge>;
    case AnswerVerificationStatus.FAILED:
      return <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>;
    case AnswerVerificationStatus.PENDING:
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending</Badge>;
    case AnswerVerificationStatus.NOT_APPLICABLE:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Not Verified</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

export default function GradeQuestionPage() {
  const { data: session } = useSession();
  const params = useParams();
  const questionId = params.questionId as string;
  const canReview = session?.user?.role && [1, 2, 3].includes(session.user.role);

  const [answers, setAnswers] = useState<AssignmentAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Current answer index
  const [currentIdx, setCurrentIdx] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "ungraded">("ungraded");

  // Score input
  const [score, setScore] = useState<number | string>("");
  const [submitting, setSubmitting] = useState(false);

  const ungradedCount = answers.filter(a => !a.grades || a.grades.length === 0).length;

  // Load answers for this question
  const loadData = useCallback(async () => {
    if (!session?.user?.token || !canReview) return;
    setLoading(true);
    try {
      const aResp = await listAssignmentAnswers(create(ListAssignmentAnswersRequestSchema, {
        assignmentQuestionId: questionId,
        userToken: session.user.token,
        excludeDrafts: true,
        pageSize: 500,
        pageToken: "1",
      }));
      setAnswers(aResp.answers);
    } catch (e) {
      console.error("Error loading data:", e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [session, canReview, questionId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter visible answers based on mode
  const visibleAnswers = filterMode === "ungraded"
    ? answers.filter(a => !a.grades || a.grades.length === 0)
    : answers;

  const displayedAnswer = visibleAnswers[currentIdx] || null;

  // When filter mode changes, reset index
  useEffect(() => {
    setCurrentIdx(0);
  }, [filterMode]);

  // Pre-fill score if already graded
  useEffect(() => {
    if (displayedAnswer) {
      const g = displayedAnswer.grades?.[displayedAnswer.grades.length - 1];
      setScore(g ? g.grade : "");
    }
  }, [displayedAnswer]);

  // Handle grade submission
  const handleGrade = async () => {
    if (!session?.user?.token || !displayedAnswer) return;
    const scoreNum = typeof score === "string" ? parseFloat(score) : score;
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("Score must be between 0-100");
      return;
    }
    setSubmitting(true);
    try {
      await gradeAssignmentAnswer(create(GradeAssignmentAnswerRequestSchema, {
        answerId: displayedAnswer.id,
        userToken: session.user.token,
        grade: scoreNum,
      }));
      toast.success("Graded!");

      // Update local state
      setAnswers(prev => prev.map(a =>
        a.id === displayedAnswer.id
          ? { ...a, grades: [{ grade: scoreNum, gradedByUserId: session.user!.id!, id: "", assignmentAnswerId: a.id, createdAt: "", updatedAt: "" } as AssignmentGrade] }
          : a
      ));

      // Auto-advance to next ungraded
      if (filterMode === "ungraded") {
        if (currentIdx < visibleAnswers.length - 1) {
          setCurrentIdx(i => i + 1);
        } else {
          toast.success("All answers graded!");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grade");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle return
  const handleReturn = async () => {
    if (!session?.user?.token || !displayedAnswer) return;
    try {
      await returnAssignmentAnswer(create(ReturnAssignmentAnswerRequestSchema, {
        answerId: displayedAnswer.id,
        userToken: session.user.token,
      }));
      toast.success("Answer returned to student");
      setAnswers(prev => prev.filter(a => a.id !== displayedAnswer.id));
      if (!visibleAnswers[currentIdx]) setCurrentIdx(Math.max(0, currentIdx - 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to return");
    }
  };

  // Loading / empty states
  if (!canReview) {
    return (
      <div className="container mx-auto py-8">
        <Card><CardContent className="py-8 text-center">
          <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">Only teachers, assistants, and admins can grade.</p>
        </CardContent></Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Card><CardContent className="py-16 text-center text-muted-foreground">Loading...</CardContent></Card>
      </div>
    );
  }

  if (visibleAnswers.length === 0) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/review"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
          <h1 className="text-2xl font-bold">Grade Submissions</h1>
        </div>
        <Card><CardContent className="py-16 text-center space-y-4">
          <ClipboardCheck className="h-16 w-16 mx-auto text-green-500" />
          <h2 className="text-xl font-semibold text-green-700">All Clear!</h2>
          <p className="text-muted-foreground">
            {filterMode === "ungraded"
              ? "All submissions have been graded."
              : "No submissions found for this question."}
          </p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/review">Back to Review Workbench</Link>
          </Button>
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
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">Grade Submissions</h1>
          <p className="text-sm text-muted-foreground">Grading submission {currentIdx + 1} of {visibleAnswers.length}</p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          <Star className="h-3.5 w-3.5 mr-1 text-yellow-500" />
          {ungradedCount} ungraded / {answers.length} total
        </Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={filterMode === "ungraded" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterMode("ungraded")}
        >
          Ungraded ({ungradedCount})
        </Button>
        <Button
          variant={filterMode === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterMode("all")}
        >
          All ({answers.length})
        </Button>
      </div>

      {/* Student answer card */}
      {displayedAnswer && (
        <>
          {/* Student info bar */}
          <Card>
            <CardContent className="py-3 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-lg">
                  {displayedAnswer.authorName || displayedAnswer.authorId.substring(0, 8)}
                </span>
                <VerificationBadge status={displayedAnswer.verificationStatus} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Submitted: {displayedAnswer.createdAt ? new Date(displayedAnswer.createdAt).toLocaleString() : "—"}</span>
                {displayedAnswer.grades && displayedAnswer.grades.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50">
                    Current: {displayedAnswer.grades[displayedAnswer.grades.length - 1].grade}/100
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Answer content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedAnswer.informalAnswer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />Natural Language Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                    style={{ wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto" }}>
                    <Markdown content={displayedAnswer.informalAnswer} />
                  </div>
                </CardContent>
              </Card>
            )}

            {displayedAnswer.formalAnswer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Code className="h-4 w-4" />Formal Answer (Lean 4)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="min-w-0 overflow-x-hidden w-full">
                    <Lean4CodeBlock code={displayedAnswer.formalAnswer} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Grading form */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-end gap-6">
                <div className="space-y-2">
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min={0}
                    max={100}
                    value={score}
                    onChange={e => setScore(e.target.value)}
                    className="w-32 text-lg"
                    autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleGrade(); }}
                  />
                </div>
                {score !== "" && !isNaN(Number(score)) && (
                  <div className="pb-1">
                    <Badge className={`text-base px-3 py-1.5 ${
                      Number(score) >= 90 ? "bg-green-100 text-green-700 border-green-300"
                      : Number(score) >= 80 ? "bg-blue-100 text-blue-700 border-blue-300"
                      : Number(score) >= 70 ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                      : Number(score) >= 60 ? "bg-orange-100 text-orange-700 border-orange-300"
                      : "bg-red-100 text-red-700 border-red-300"
                    }`}>
                      {score}/100
                    </Badge>
                  </div>
                )}
                <Button onClick={handleGrade} disabled={submitting || score === "" || isNaN(Number(score))}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {submitting ? "Saving..." : "Submit & Next"}
                </Button>
                {displayedAnswer.grades && displayedAnswer.grades.length > 0 && (
                  <Button variant="outline" onClick={handleReturn}>
                    <RotateCcw className="h-4 w-4 mr-2" />Return
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIdx + 1} / {visibleAnswers.length}
            </span>
            <Button
              variant="outline"
              disabled={currentIdx >= visibleAnswers.length - 1}
              onClick={() => setCurrentIdx(i => i + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
