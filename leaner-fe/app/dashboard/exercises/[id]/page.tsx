"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  Question,
  Answer,
  GetQuestionRequest,
  ListAnswersRequest,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { getQuestion, listAnswers } from "@/lib/grpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Code, Send, History, FileText } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";
import { Lean4CodeBlock } from "@/components/CodeBlock";
import Link from "next/link";

export default function ExercisePage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [myAnswers, setMyAnswers] = useState<Answer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const questionId = params.id as string;

  useEffect(() => {
    if (questionId) {
      loadQuestion();
    }
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const request = { id: questionId } as GetQuestionRequest;
      const response = await getQuestion(request);
      setQuestion(response.question || null);
    } catch (error) {
      console.error("Error loading question:", error);
      toast.error("Failed to load exercise");
      router.push("/dashboard/exercises");
    } finally {
      setLoading(false);
    }
  };

  // Load user's previous answers for this question
  useEffect(() => {
    if (questionId && session?.user?.token) {
      setLoadingAnswers(true);
      listAnswers({
        pageSize: 20,
        pageToken: "",
        userToken: session.user.token,
        questionTitle: undefined,
        userName: session.user.name,
        excludeDrafts: false,
      } as ListAnswersRequest)
        .then((resp) => {
          setMyAnswers(
            resp.answers.filter((a) => a.questionId === questionId),
          );
        })
        .catch(() => {})
        .finally(() => setLoadingAnswers(false));
    }
  }, [questionId, session?.user?.token, session?.user?.name]);

  const getMathDifficultyDisplayName = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return "Unspecified";
      case 1:
        return "Simp";
      case 2:
        return "Easy";
      case 3:
        return "Medium";
      case 4:
        return "Hard";
      case 5:
        return "Sorry";
      default:
        return "Unspecified";
    }
  };

  const getLeanDifficultyDisplayName = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return "Unspecified";
      case 1:
        return "Simp";
      case 2:
        return "Easy";
      case 3:
        return "Medium";
      case 4:
        return "Hard";
      case 5:
        return "Sorry";
      default:
        return "Unspecified";
    }
  };

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 0:
        return "bg-gray-100 text-gray-700 border-gray-300";
      case 1:
        return "bg-green-100 text-green-700 border-green-300";
      case 2:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case 3:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case 4:
        return "bg-orange-100 text-orange-700 border-orange-300";
      case 5:
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading exercise...</div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Exercise not found</h1>
          <p className="text-muted-foreground mb-6">
            The exercise you are looking for does not exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/dashboard/exercises">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Exercises
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="outline" asChild>
          <Link href="/dashboard/exercises">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exercises
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{question.title}</h1>
        </div>
        <Button asChild>
          <Link href={`/dashboard/exercises/${questionId}/submit`}>
            <Send className="h-4 w-4 mr-2" />
            Submit Answer
          </Link>
        </Button>
      </div>

      {/* Question metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Exercise Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Math Difficulty
              </h4>
              <Badge
                variant="outline"
                className={getDifficultyColor(question.mathDifficulty)}
              >
                {getMathDifficultyDisplayName(question.mathDifficulty)}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Lean Difficulty
              </h4>
              <Badge
                variant="outline"
                className={getDifficultyColor(question.leanDifficulty)}
              >
                {getLeanDifficultyDisplayName(question.leanDifficulty)}
              </Badge>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1">
                {question.tags.length > 0 ? (
                  question.tags.map((tag) => (
                    <Badge key={tag.id} variant="secondary" className="text-xs">
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No tags
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informal description */}
      <Card>
        <CardHeader>
          <CardTitle>Question Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words">
            <Markdown
              content={question.informalDescription}
              className="max-w-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Formal description (if available) */}
      {question.formalDescription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Formal Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Lean4CodeBlock
              code={question.formalDescription}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}

      {/* My Previous Answers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            My Submission History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAnswers ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : myAnswers.length === 0 ? (
            <div className="text-center py-4">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No answers submitted yet</p>
              <Button asChild className="mt-3">
                <Link href={`/dashboard/exercises/${questionId}/submit`}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Answer
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {myAnswers.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/answers/${a.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={a.isDraft ? "outline" : "default"}
                      className={a.isDraft ? "text-xs" : "text-xs bg-blue-100 text-blue-700"}
                    >
                      {a.isDraft ? "Draft" : "Submitted"}
                    </Badge>
                    <span className="text-sm">
                      {a.informalAnswerContent
                        ? a.informalAnswerContent.slice(0, 60) +
                          (a.informalAnswerContent.length > 60 ? "..." : "")
                        : "(No text answer)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.verificationStatus === AnswerVerificationStatus.SUCCESSFUL && (
                      <Badge className="bg-green-100 text-green-700 text-xs">Verified</Badge>
                    )}
                    {a.grading && (
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {a.grading.score}/100
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      View details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
