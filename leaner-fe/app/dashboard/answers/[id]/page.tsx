"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import {
  Answer,
  GetAnswerRequest,
  UpdateAnswerRequest,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { getAnswer, updateAnswer } from "@/lib/grpc";
import { useVerificationPolling } from "@/lib/useVerificationPolling";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Edit, Save, X, FileText, PenTool, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { Lean4CodeBlock } from "@/components/CodeBlock";

export default function AnswerPage() {
  const { data: session } = useSession();
  const params = useParams();
  const answerId = params.id as string;

  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    informalContent: "",
    formalContent: "",
  });
  const [saving, setSaving] = useState(false);
  const [changingDraftStatus, setChangingDraftStatus] = useState(false);

  useEffect(() => {
    if (answerId) {
      loadAnswer();
    }
  }, [answerId]);

  const loadAnswer = async () => {
    try {
      setLoading(true);
      const request = {
        answerId,
        userToken: session?.user?.token,
      } as GetAnswerRequest;

      const response = await getAnswer(request);
      setAnswer(response.answer || null);

      // Initialize edit form with current data
      setEditFormData({
        informalContent: response.answer?.informalAnswerContent || "",
        formalContent: response.answer?.formalAnswerContent || "",
      });
    } catch (error) {
      console.error("Error loading answer:", error);
      toast.error("Failed to load answers");
      // router.push("/dashboard/my-answers");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form data to original values
    setEditFormData({
      informalContent: answer?.informalAnswerContent || "",
      formalContent: answer?.formalAnswerContent || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!session?.user?.token || !answer) return;

    // Validate that at least one answer type is provided
    if (
      !editFormData.informalContent.trim() &&
      !editFormData.formalContent.trim()
    ) {
      toast.error("Please provide a natural language or formal answer");
      return;
    }

    try {
      setSaving(true);
      const request = {
        answerId: answer.id,
        userToken: session.user.token,
        informalAnswerContent: editFormData.informalContent.trim() || undefined,
        formalAnswerContent: editFormData.formalContent.trim() || undefined,
      } as UpdateAnswerRequest;

      const response = await updateAnswer(request);
      setAnswer(response.answer || null);
      setIsEditing(false);
      toast.success("Answer updated");
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("Failed to update answer");
    } finally {
      setSaving(false);
    }
  };

  const handleChangeDraftStatus = async () => {
    if (!session?.user?.token || !answer) return;

    const newDraftStatus = !answer.isDraft;

    try {
      setChangingDraftStatus(true);
      const request = {
        answerId: answer.id,
        userToken: session.user.token,
        isDraft: newDraftStatus,
      } as UpdateAnswerRequest;

      const response = await updateAnswer(request);
      setAnswer(response.answer || null);

      // Update edit form data to reflect the new draft status
      setEditFormData((prev) => ({
        ...prev,
      }));

      const statusText = newDraftStatus ? "draft" : "official submission";
      toast.success(`Answer changed to ${statusText}`);
    } catch (error) {
      console.error("Error changing draft status:", error);
      toast.error("Failed to change answer status");
    } finally {
      setChangingDraftStatus(false);
    }
  };

  // Auto-poll verification status when PENDING
  const { answer: polledAnswer } = useVerificationPolling({
    answerId,
    token: session?.user?.token,
  });

  // Merge polled answer into local state
  const displayAnswer = useMemo(() => {
    if (polledAnswer && answer && polledAnswer.verificationStatus !== answer.verificationStatus) {
      return { ...answer, verificationStatus: polledAnswer.verificationStatus };
    }
    return answer;
  }, [answer, polledAnswer]);

  const getVerificationStatusBadge = (status: AnswerVerificationStatus) => {
    switch (status) {
      case AnswerVerificationStatus.SUCCESSFUL:
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            Verified
          </Badge>
        );
      case AnswerVerificationStatus.FAILED:
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>
        );
      case AnswerVerificationStatus.PENDING:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
            Pending...
          </Badge>
        );
      case AnswerVerificationStatus.NOT_APPLICABLE:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300">
            Not Verified
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const isOwner = session?.user?.name === answer?.userName;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading answers...</div>
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Answer not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/my-answers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Answers
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Answer Details</h1>
            <p className="text-sm text-muted-foreground">
              Question: {answer.questionTitle}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Change Draft Status Button - Available to owner only if not graded */}
          {isOwner && !isEditing && !answer.grading && (
            <Button
              variant="outline"
              onClick={handleChangeDraftStatus}
              disabled={changingDraftStatus}
            >
              {answer.isDraft ? (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  {changingDraftStatus ? "Publishing..." : "Publish Answer"}
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  {changingDraftStatus ? "Change to Draft..." : "Change to Draft"}
                </>
              )}
            </Button>
          )}
          {isOwner && !isEditing && answer.grading && (
            <Button disabled variant="outline" title="Cannot change status of a graded answer">
              {answer.isDraft ? (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Publish (Graded)
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Change to Draft (Graded)
                </>
              )}
            </Button>
          )}

          {/* Edit Button - Only visible to owner, disabled if graded */}
          {isOwner && !isEditing && !answer.grading && (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Answer
            </Button>
          )}
          {isOwner && !isEditing && answer.grading && (
            <Button disabled variant="outline" title="Cannot edit a graded answer">
              <Edit className="h-4 w-4 mr-2" />
              Edit Answer (Graded)
            </Button>
          )}

          {/* Save/Cancel Buttons when editing */}
          {isEditing && (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Answer Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Answer Information</span>
            <div className="flex items-center gap-2">
              {getVerificationStatusBadge(displayAnswer?.verificationStatus ?? AnswerVerificationStatus.NOT_APPLICABLE)}
              <Badge
                variant={answer.isDraft ? "outline" : "default"}
                className={
                  answer.isDraft
                    ? "bg-orange-100 text-orange-700 border-orange-300 flex items-center gap-1"
                    : "bg-blue-100 text-blue-700 border-blue-300 flex items-center gap-1"
                }
              >
                {answer.isDraft ? (
                  <>
                    <PenTool className="h-3 w-3" />
                    Draft
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3" />
                    Published
                  </>
                )}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Author:</span> {answer.userName}
            </div>
            <div>
              <span className="font-medium">Question:</span>{" "}
              <Link
                href={`/dashboard/exercises/${answer.questionId}`}
                className="text-blue-600 hover:underline"
              >
                {answer.questionTitle}
              </Link>
            </div>
          </div>

          {answer.grading && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Score</h4>
                {(isOwner ||
                  (session?.user?.role &&
                    [1, 2, 3].includes(session.user.role))) && (
                  <Badge
                    variant="outline"
                    className={
                      answer.grading.score >= 80
                        ? "bg-green-100 text-green-700 border-green-300"
                        : answer.grading.score >= 60
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : "bg-red-100 text-red-700 border-red-300"
                    }
                  >
                    {answer.grading.score}/100
                  </Badge>
                )}
              </div>
              {answer.grading.feedbackText && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Grading Feedback:</h5>
                  <div className="text-sm">
                    <Markdown
                      content={answer.grading.feedbackText}
                      className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Answer Content */}
      {isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="informal-answer">Natural Language Answer</Label>
              <Textarea
                id="informal-answer"
                value={editFormData.informalContent}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    informalContent: e.target.value,
                  })
                }
                placeholder="Describe your answer in natural language..."
                className="resize-none h-40 overflow-y-auto whitespace-pre-wrap break-words"
                style={{ minHeight: "10rem", maxHeight: "10rem" }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formal-answer">Formal Answer (Lean4)</Label>
              <Textarea
                id="formal-answer"
                value={editFormData.formalContent}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    formalContent: e.target.value,
                  })
                }
                placeholder="Write your answer in Lean4..."
                className="resize-none h-40 overflow-y-auto whitespace-pre font-mono break-words"
                style={{ minHeight: "10rem", maxHeight: "10rem" }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Informal Answer */}
          {answer.informalAnswerContent && (
            <Card>
              <CardHeader>
                <CardTitle>Natural Language Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
                  <Markdown content={answer.informalAnswerContent} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formal Answer */}
          {answer.formalAnswerContent && (
            <Card>
              <CardHeader>
                <CardTitle>Formal Answer (Lean4)</CardTitle>
              </CardHeader>
              <CardContent>
                <Lean4CodeBlock code={answer.formalAnswerContent} />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
