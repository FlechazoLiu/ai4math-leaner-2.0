"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import {
  AssignmentQuestion,
  AssignmentAnswer,
  ListAssignmentQuestionsRequest,
  ListAssignmentAnswersRequest,
  SubmitAssignmentAnswerRequest,
  UpdateAssignmentAnswerRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listAssignmentQuestions,
  listAssignmentAnswers,
  submitAssignmentAnswer,
  updateAssignmentAnswer,
} from "@/lib/grpc";
import { toast } from "sonner";
import AnswerEditor from "@/components/AnswerEditor";

export default function SubmitAssignmentAnswerPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const [question, setQuestion] = useState<AssignmentQuestion | null>(null);
  const [existingAnswer, setExistingAnswer] = useState<AssignmentAnswer | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const courseId = params.id as string;
  const assignmentId = params.assignmentId as string;
  const questionId = params.questionId as string;

  const isEditing = !!existingAnswer;

  useEffect(() => {
    if (questionId && session?.user?.token) {
      loadData();
    }
  }, [questionId, session?.user?.token]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load question from the assignment's question list
      const questionsRequest = {
        assignmentId: assignmentId,
        userToken: session?.user?.token,
        pageSize: 50,
        pageToken: "1",
      } as ListAssignmentQuestionsRequest;

      const questionsResponse = await listAssignmentQuestions(questionsRequest);
      const foundQuestion = questionsResponse.questions?.find(
        (q) => q.id === questionId,
      );
      setQuestion(foundQuestion || null);

      if (!foundQuestion) {
        toast.error("Assignment question not found");
        router.push(`/dashboard/courses/${courseId}/assignments/${assignmentId}`);
        return;
      }

      // Load existing answer if any
      const answersRequest = {
        userToken: session?.user?.token,
        assignmentQuestionId: questionId,
        pageSize: 10,
        pageToken: "1",
        excludeDrafts: false,
      } as ListAssignmentAnswersRequest;

      const answersResponse = await listAssignmentAnswers(answersRequest);
      const userAnswer = answersResponse.answers?.[0];

      if (userAnswer) {
        setExistingAnswer(userAnswer);
      }
    } catch (error) {
      console.error("Error loading assignment data:", error);
      toast.error("Failed to load assignment question");
      router.push(`/dashboard/courses/${courseId}/assignments/${assignmentId}`);
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

    const isDraft = _isDraft ?? true; // Assignment answers default to draft

    if (isEditing && existingAnswer) {
      // Update existing answer — keep it as draft
      const updateRequest = {
        answerId: existingAnswer.id,
        userToken: session.user.token,
        informalAnswer: informal,
        formalAnswer: formal || undefined,
        isDraft: isDraft,
      } as UpdateAssignmentAnswerRequest;

      await updateAssignmentAnswer(updateRequest);
      toast.success(
        isDraft ? "Answer saved as draft" : "Answer submitted successfully!",
      );
    } else {
      // Create new answer
      const createRequest = {
        assignmentQuestionId: questionId,
        userToken: session.user.token,
        informalAnswer: informal,
        formalAnswer: formal || undefined,
        isDraft: isDraft,
      } as SubmitAssignmentAnswerRequest;

      await submitAssignmentAnswer(createRequest);
      toast.success(
        isDraft ? "Answer saved as draft" : "Answer submitted successfully!",
      );
    }

    router.push(
      `/dashboard/courses/${courseId}/assignments/${assignmentId}`,
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading assignment question...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Assignment question not found</h1>
          <p className="text-muted-foreground mb-6">
            The assignment question you are looking for does not exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnswerEditor
      questionId={questionId}
      questionTitle={
        isEditing ? `Edit Answer: ${question.title}` : `Submit Answer: ${question.title}`
      }
      informalDescription={question.informalDescription}
      formalDescription={question.formalDescription}
      existingInformal={existingAnswer?.informalAnswer ?? ""}
      existingFormal={existingAnswer?.formalAnswer ?? ""}
      isEditing={isEditing}
      onSubmit={handleSubmit}
      submitLabel={isEditing ? "Update Answer" : "Save Answer"}
      backUrl={`/dashboard/courses/${courseId}/assignments/${assignmentId}`}
      submitAsDraft={true}
    />
  );
}
