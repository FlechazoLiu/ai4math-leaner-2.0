"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  Question,
  GetQuestionRequest,
  SubmitAnswerRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { getQuestion, submitAnswer } from "@/lib/grpc";
import { toast } from "sonner";
import AnswerEditor from "@/components/AnswerEditor";

export default function SubmitAnswerPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubmit = async (
    informal: string,
    formal: string,
    _isDraft?: boolean,
  ) => {
    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    const request = {
      questionId: questionId,
      userToken: session.user.token,
      informalAnswerContent: informal,
      formalAnswerContent: formal || undefined,
      isDraft: _isDraft ?? false,
    } as SubmitAnswerRequest;

    await submitAnswer(request);
    const submissionType = _isDraft ? "draft" : "answer";
    toast.success(`${submissionType} submitted successfully!`);
    router.push(`/dashboard/exercises/${questionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading exercise...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Exercise not found</h1>
          <p className="text-muted-foreground mb-6">
            The exercise you are looking for does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnswerEditor
      questionId={questionId}
      questionTitle={`Submit Answer: ${question.title}`}
      informalDescription={question.informalDescription}
      formalDescription={question.formalDescription}
      onSubmit={handleSubmit}
      backUrl={`/dashboard/exercises/${questionId}`}
    />
  );
}
