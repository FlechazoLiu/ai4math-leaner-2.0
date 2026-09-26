"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { User, Clock, FileText, Code, Star } from "lucide-react";
import { toast } from "sonner";
import { gradeAssignmentAnswer } from "@/lib/grpc";
import {
  GradeAssignmentAnswerRequest,
  AssignmentAnswer,
  AssignmentGrade,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";

interface GradeAssignmentAnswerFormProps {
  answer: AssignmentAnswer;
  userToken: string;
  onGraded?: (grade: AssignmentGrade) => void;
  existingGrade?: AssignmentGrade;
  questionTitle?: string;
  authorName?: string;
}

export default function GradeAssignmentAnswerForm({
  answer,
  userToken,
  onGraded,
  existingGrade,
  questionTitle,
  authorName,
}: GradeAssignmentAnswerFormProps) {
  const [grade, setGrade] = useState(existingGrade?.grade?.toString() || "");
  const [submitting, setSubmitting] = useState(false);

  const getVerificationStatusDisplay = (status: AnswerVerificationStatus) => {
    switch (status) {
      case AnswerVerificationStatus.PENDING:
        return {
          text: "Pending",
          className: "bg-yellow-100 text-yellow-800 border-yellow-300",
          icon: "⏳",
        };
      case AnswerVerificationStatus.SUCCESSFUL:
        return {
          text: "Verified",
          className: "bg-green-100 text-green-800 border-green-300",
          icon: "✅",
        };
      case AnswerVerificationStatus.FAILED:
        return {
          text: "Failed",
          className: "bg-red-100 text-red-800 border-red-300",
          icon: "❌",
        };
      case AnswerVerificationStatus.NOT_APPLICABLE:
        return {
          text: "Not Verified",
          className: "bg-gray-100 text-gray-700 border-gray-300",
          icon: "➖",
        };
      default:
        return {
          text: "Unknown",
          className: "bg-gray-100 text-gray-700 border-gray-300",
          icon: "❓",
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!grade.trim()) {
      toast.error("Please provide a score");
      return;
    }

    const gradeValue = parseInt(grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast.error("Score must be a number between 0 and 100");
      return;
    }

    try {
      setSubmitting(true);

      const request = {
        answerId: answer.id,
        userToken: userToken,
        grade: gradeValue,
      } as GradeAssignmentAnswerRequest;

      const response = await gradeAssignmentAnswer(request);

      if (response.grade) {
        toast.success(existingGrade ? "Score updated successfully!" : "Answer graded successfully!");
        onGraded?.(response.grade);
      }
    } catch (error) {
      console.error("Error grading assignment answer:", error);
      toast.error("Failed to grade assignment answer");
    } finally {
      setSubmitting(false);
    }
  };

  const verificationStatus = getVerificationStatusDisplay(
    answer.verificationStatus,
  );

  return (
    <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold text-gray-900 mb-2">
              {questionTitle || "Assignment Answers"}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              {authorName && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{authorName}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(answer.createdAt).toLocaleDateString()}</span>
              </div>
              <Badge
                variant="outline"
                className={`${verificationStatus.className} border`}
              >
                <span className="mr-1">{verificationStatus.icon}</span>
                {verificationStatus.text}
              </Badge>
              {answer.isDraft && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800"
                >
                  Draft
                </Badge>
              )}
            </div>
          </div>
          {existingGrade && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Current Score</div>
              <div className="text-2xl font-bold text-blue-600">
                {existingGrade.grade}/100
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-6 py-6 space-y-6">
        {/* Informal Answer */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Natural Language Answer
            </h3>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <Markdown content={answer.informalAnswer} />
          </div>
        </div>

        {/* Formal Answer */}
        {answer.formalAnswer && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Code className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Formal Answer
              </h3>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-200">
              <CodeBlock code={answer.formalAnswer} language="lean4" />
            </div>
          </div>
        )}

        {/* Grading Form */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {existingGrade ? "Update Score" : "Grade Answer"}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label
                htmlFor="grade"
                className="text-sm font-medium text-gray-700"
              >
                Score (0-100)
              </Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="100"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="Enter Score (0-100)"
                className="mt-1"
                required
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {submitting
                  ? "Saving..."
                  : existingGrade
                    ? "Update Score"
                    : "Grade Answer"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
