"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  Answer,
  AssignmentAnswer,
  GetAnswerRequest,
  GradeAnswerRequest,
  GetAssignmentAnswerRequest,
  GradeAssignmentAnswerRequest,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  getAnswer,
  gradeAnswer,
  getAssignmentAnswer,
  gradeAssignmentAnswer,
} from "@/lib/grpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  GraduationCap,
  Save,
  ArrowLeft,
  FileText,
  Code,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ClipboardCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Lean4CodeBlock } from "@/components/CodeBlock";

// ---- Feedback Templates ----
const DEFAULT_TEMPLATES = [
  "The proof is clear, logically rigorous, and completely correct. Keep up the good work!",
  "The submitted answer does not compile and needs to be revised.",
  'In the proof, the section "xxx" contains an error and should be corrected to "yyy".',
  'In the proof, the section "xxx" has formatting issues and should be revised to "yyy".',
  'In the proof, the section "xxx" is not rigorous or clear enough. It is recommended to revise it to "yyy".',
  'In the proof, the section "xxx" contains steps that are difficult to formalize. It is recommended to revise it to "yyy".',
  'The translation at "xxx" is incorrect. The intended meaning is "yyy", not "abc" as stated in the original proposition. Please revise.',
  '"xxx" could be rewritten in a form more convenient for use in Lean as "yyy". Revision recommended.',
  'In the Lean proof, the section "xxx" has formatting issues and should be revised to "yyy" according to the requirements.',
  'In the Lean proof, the section "xxx" could be rewritten more concisely and clearly as "yyy". Revision recommended.',
  'In the Lean proof, the section "xxx" does not match the corresponding comments. It is recommended to revise the comments and the natural language proof.',
  'In the Lean proof, the section "xxx" does not match the corresponding comments. It is recommended to revise the Lean code.',
  'In the Lean proof, the comments for the entire section "xxx" should be broken down into finer sub-steps, revised as "yyy".',
  'Your answer is correct, but in the early stages of learning, avoid using "abc" and instead use "cba" to deepen your understanding.',
];

function loadTemplates(): string[] {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;
  try {
    const saved = localStorage.getItem("grade-feedback-templates");
    return saved ? JSON.parse(saved) : [...DEFAULT_TEMPLATES];
  } catch {
    return [...DEFAULT_TEMPLATES];
  }
}

function persistTemplates(ts: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("grade-feedback-templates", JSON.stringify(ts));
}

// ---- Types ----
type AnswerSource = "exercise" | "assignment";

// ---- Sub-components ----
function VerificationBadge({ status }: { status: AnswerVerificationStatus }) {
  switch (status) {
    case AnswerVerificationStatus.SUCCESSFUL:
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified Successfully
        </Badge>
      );
    case AnswerVerificationStatus.FAILED:
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case AnswerVerificationStatus.PENDING:
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
          <Clock className="h-3 w-3 mr-1" />
          Awaiting Verification
        </Badge>
      );
    case AnswerVerificationStatus.NOT_APPLICABLE:
      return (
        <Badge className="bg-gray-100 text-gray-700 border-gray-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          N/A
        </Badge>
      );
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

// ---- Main Page ----
export default function GradePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const answerId = params.id as string;
  const answerType = (searchParams.get("type") || "exercise") as AnswerSource;

  const canReview =
    session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Exercise answer state
  const [answer, setAnswer] = useState<Answer | null>(null);
  // Assignment answer state
  const [assignmentAnswer, setAssignmentAnswer] = useState<AssignmentAnswer | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | string>("");
  const [feedback, setFeedback] = useState("");

  // Templates
  const [templates, setTemplates] = useState<string[]>([]);
  const [newTemplate, setNewTemplate] = useState("");
  const [activeTab, setActiveTab] = useState<"grade" | "templates">("grade");

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  // ---- Load answer ----
  useEffect(() => {
    if (session?.user?.token && canReview) {
      loadAnswer();
    }
  }, [answerId, session, canReview, answerType]);

  const loadAnswer = useCallback(async () => {
    if (!session?.user?.token || !canReview) return;
    try {
      setLoading(true);
      if (answerType === "assignment") {
        const resp = await getAssignmentAnswer({
          answerId,
          userToken: session.user.token,
        } as GetAssignmentAnswerRequest);
        setAssignmentAnswer(resp.answer || null);
        if (resp.answer?.grades?.length) {
          const latestGrade = resp.answer.grades[resp.answer.grades.length - 1];
          setScore(latestGrade.grade);
          setFeedback("");
        }
      } else {
        const resp = await getAnswer({
          answerId,
          userToken: session.user.token,
        } as GetAnswerRequest);
        setAnswer(resp.answer || null);
        if (resp.answer?.grading) {
          setScore(resp.answer.grading.score);
          setFeedback(resp.answer.grading.feedbackText);
        }
      }
    } catch (e) {
      console.error("Error loading answer:", e);
      toast.error("Failed to load answers");
      router.push("/dashboard/review");
    } finally {
      setLoading(false);
    }
  }, [answerId, session, canReview, answerType, router]);

  // ---- Submit grading ----
  const handleSubmitGrading = async () => {
    if (!session?.user?.token || !canReview) return;
    const scoreNum = typeof score === "string" ? parseFloat(score) : score;
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("Score must be between 0-100");
      return;
    }

    try {
      setSubmitting(true);
      if (answerType === "assignment") {
        await gradeAssignmentAnswer({
          answerId,
          userToken: session.user.token,
          grade: scoreNum,
        } as GradeAssignmentAnswerRequest);
        toast.success("Assignment grading submitted successfully");
      } else {
        if (!feedback.trim()) {
          toast.error("Please provide feedback");
          return;
        }
        await gradeAnswer({
          answerId,
          score: scoreNum,
          feedbackText: feedback.trim(),
          userToken: session.user.token,
        } as GradeAnswerRequest);
        toast.success(
          answer?.grading ? "Grading updated" : "Grading submitted successfully",
        );
      }
      loadAnswer();
    } catch (e) {
      console.error("Error submitting grading:", e);
      toast.error("Failed to submit grading");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Template management ----
  const addTemplate = () => {
    if (!newTemplate.trim()) return;
    const updated = [...templates, newTemplate.trim()];
    setTemplates(updated);
    persistTemplates(updated);
    setNewTemplate("");
    toast.success("Template added");
  };

  const deleteTemplate = (idx: number) => {
    const updated = templates.filter((_, i) => i !== idx);
    setTemplates(updated);
    persistTemplates(updated);
    toast.success("Template deleted");
  };

  const resetTemplates = () => {
    setTemplates([...DEFAULT_TEMPLATES]);
    persistTemplates([...DEFAULT_TEMPLATES]);
    toast.success("Restored default templates");
  };

  // ---- Common derived state ----
  const verificationStatus =
    answerType === "assignment"
      ? assignmentAnswer?.verificationStatus
      : answer?.verificationStatus;

  const informalContent =
    answerType === "assignment"
      ? assignmentAnswer?.informalAnswer
      : answer?.informalAnswerContent;

  const formalContent =
    answerType === "assignment"
      ? assignmentAnswer?.formalAnswer
      : answer?.formalAnswerContent;

  const authorName =
    answerType === "assignment"
      ? (assignmentAnswer?.authorName || `Student (${(assignmentAnswer?.authorId || "").substring(0, 8)})`)
      : answer?.userName || "Unknown";

  const questionTitle =
    answerType === "assignment"
      ? (assignmentAnswer?.questionTitle || `Question (${(assignmentAnswer?.assignmentQuestionId || "").substring(0, 8)})`)
      : answer?.questionTitle || "Unknown Question";

  const hasExistingGrade =
    answerType === "assignment"
      ? (assignmentAnswer?.grades?.length ?? 0) > 0
      : !!answer?.grading;

  // ---- Render ----
  if (!canReview) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only teachers, assistants, and admins can grade answers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading answers...</div>
      </div>
    );
  }

  if (!answer && !assignmentAnswer) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Answer not found</h2>
              <p className="text-muted-foreground mb-4">This answer does not exist or you do not have permission to access it.</p>
              <Button asChild>
                <Link href="/dashboard/review">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Review
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/review">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Review
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {answerType === "assignment" ? "Grade Assignment Answers" : "Grade Answer"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Provide score and feedback for this student&apos;s answer
          </p>
        </div>
        {answerType === "assignment" && (
          <Badge variant="outline" className="flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" />
            Assignment Answers
          </Badge>
        )}
      </div>

      {/* Answer Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Answer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Question</Label>
              <div className="font-mono text-sm mt-1 break-all">{questionTitle}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                {answerType === "assignment" ? "Author ID" : "Student"}
              </Label>
              <div className="text-sm mt-1 break-all">{authorName}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Answer ID</Label>
              <div className="text-sm mt-1 font-mono break-all">{assignmentAnswer?.authorId ? assignmentAnswer.authorId.substring(0, 8) + "..." : answerId.substring(0, 8) + "..."}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <div className="flex items-center gap-2 mt-1">
                {verificationStatus !== undefined && (
                  <VerificationBadge status={verificationStatus} />
                )}
              </div>
            </div>
          </div>

          {/* Existing grade info */}
          {hasExistingGrade && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">Current Grade</span>
              </div>
              {answerType === "assignment" ? (
                <div className="space-y-2">
                  {assignmentAnswer?.grades?.map((g) => (
                    <div key={g.id} className="text-sm text-blue-700 flex items-center gap-4">
                      <span>
                        <span className="font-medium">Score:</span> {g.grade}/100
                      </span>
                      <span>
                        <span className="font-medium">Graded by:</span> {g.gradedByUserId.slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Score:</span>{" "}
                    {answer?.grading?.score}/100
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Graded by:</span>{" "}
                    {answer?.grading?.gradedByUserName}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Content - split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {informalContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Natural Language Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                style={{ wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto" }}>
                <Markdown content={informalContent} />
              </div>
            </CardContent>
          </Card>
        )}

        {formalContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                Formal Answer (Lean4)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-w-0 overflow-x-hidden w-full">
                <Lean4CodeBlock code={formalContent} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Grading Form */}
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            {hasExistingGrade ? "Update Grade" : "Submit Grade"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 min-w-0">
          {/* Tabs for grade vs templates */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "grade" | "templates")}>
            <TabsList>
              <TabsTrigger value="grade">Grading</TabsTrigger>
              <TabsTrigger value="templates">Feedback Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="grade" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Enter score..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Score Preview</Label>
                  <div className="h-10 flex items-center">
                    {score !== "" && !isNaN(Number(score)) ? (
                      <Badge
                        className={`text-lg px-3 py-1 ${
                          Number(score) >= 90
                            ? "bg-green-100 text-green-700 border-green-300"
                            : Number(score) >= 80
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : Number(score) >= 70
                                ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                : Number(score) >= 60
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-red-100 text-red-700 border-red-300"
                        }`}
                      >
                        {score}/100
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Enter score to preview</span>
                    )}
                  </div>
                </div>
              </div>

              {answerType !== "assignment" && (
                <>
                  <hr className="border-gray-200" />
                  <div className="space-y-2">
                    <Label htmlFor="feedback">Feedback</Label>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <Label className="text-sm font-medium mb-2 block">Quick Suggestions</Label>
                      <Select
                        onValueChange={(v) => {
                          if (v && v !== "__none__") {
                            setFeedback((prev) => (prev ? prev + "\n\n" + v : v));
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a feedback suggestion..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Select suggestion --</SelectItem>
                          {templates.map((t, i) => (
                            <SelectItem key={i} value={t}>
                              <span className="text-sm">{t.slice(0, 60)}{t.length > 60 ? "..." : ""}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      id="feedback"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide constructive feedback..."
                      className="resize-none h-40"
                      style={{ minHeight: "10rem" }}
                    />
                  </div>

                  {feedback && (
                    <div className="space-y-2">
                      <Label>Feedback Preview</Label>
                      <div className="border rounded-md p-4 bg-gray-50 overflow-x-hidden w-full min-w-0"
                        style={{ wordBreak: "break-word", overflowWrap: "anywhere", hyphens: "auto" }}>
                        <Markdown
                          content={feedback}
                          className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {answerType === "assignment" && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                  Assignment answers grading only supports scores, not feedback text.
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <Button
                  onClick={handleSubmitGrading}
                  disabled={
                    submitting ||
                    score === "" ||
                    isNaN(Number(score)) ||
                    (answerType !== "assignment" && !feedback.trim())
                  }
                  className="min-w-32"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : hasExistingGrade ? "Update Grade" : "Submit Grade"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href={answerType === "assignment" ? "/dashboard/review" : `/dashboard/answers/${answerId}`}>
                    View Answer Details
                  </Link>
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  placeholder="Add new feedback template..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addTemplate();
                  }}
                />
                <Button onClick={addTemplate} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between p-3 rounded-lg border hover:bg-gray-50"
                  >
                    <span className="text-sm flex-1 mr-2">{t}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(i)}
                      className="text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No custom templates yet
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={resetTemplates}>
                  Restore Default Templates
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
