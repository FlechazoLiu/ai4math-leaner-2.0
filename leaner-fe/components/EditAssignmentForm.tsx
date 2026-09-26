"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import CreateAssignmentQuestionForm from "@/components/CreateAssignmentQuestionForm";
import EditAssignmentQuestionForm from "@/components/EditAssignmentQuestionForm";
import {
  updateAssignment,
  listAssignmentQuestions,
  deleteAssignmentQuestion,
} from "@/lib/grpc";
import {
  UpdateAssignmentRequest,
  ListAssignmentQuestionsRequest,
  DeleteAssignmentQuestionRequest,
  Assignment,
  AssignmentQuestion,
} from "@/lib/gen/leaner/v1/leaner_pb";

interface EditAssignmentFormProps {
  courseId: string;
  assignment: Assignment;
  userToken: string;
}

export default function EditAssignmentForm({
  courseId,
  assignment,
  userToken,
}: EditAssignmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(assignment.title);
  const [description, setDescription] = useState(assignment.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignmentQuestions, setAssignmentQuestions] = useState<
    AssignmentQuestion[]
  >([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [isDraft, setIsDraft] = useState(assignment.isDraft);

  useEffect(() => {
    loadAssignmentQuestions();
  }, []);

  const loadAssignmentQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const request = {
        assignmentId: assignment.id,
        userToken: userToken,
        pageSize: 50,
        pageToken: "1",
      } satisfies Partial<ListAssignmentQuestionsRequest>;

      const response = await listAssignmentQuestions(
        request as ListAssignmentQuestionsRequest,
      );
      setAssignmentQuestions(response.questions || []);
    } catch (error) {
      console.error("Error loading assignment questions:", error);
      setError("Failed to load assignment questions");
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!title.trim()) {
      setError("Assignment title is required");
      return;
    }

    if (!description.trim()) {
      setError("Assignment description is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = {
        assignmentId: assignment.id,
        userToken: userToken,
        title: title.trim(),
        description: description.trim(),
      } satisfies Partial<UpdateAssignmentRequest>;

      await updateAssignment(request as UpdateAssignmentRequest);
      setError(null);
      // Show success message or update UI
    } catch (error) {
      console.error("Error updating assignment:", error);
      setError("Failed to update assignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      const request = {
        questionId: questionId,
        userToken: userToken,
      } satisfies Partial<DeleteAssignmentQuestionRequest>;

      await deleteAssignmentQuestion(
        request as DeleteAssignmentQuestionRequest,
      );

      // Update local state
      setAssignmentQuestions((prev) => prev.filter((q) => q.id !== questionId));
    } catch (error) {
      console.error("Error deleting assignment question:", error);
      setError("Failed to delete question from assignment.");
    }
  };

  const handlePublish = async () => {
    if (assignmentQuestions.length === 0) {
      setError(
        "Cannot publish assignment without questions. Please add at least one question.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = {
        assignmentId: assignment.id,
        userToken: userToken,
        title: title.trim(),
        description: description.trim(),
        isDraft: false, // Publish the assignment
      } satisfies Partial<UpdateAssignmentRequest>;

      await updateAssignment(request as UpdateAssignmentRequest);
      setIsDraft(false);
      // Show success message
    } catch (error) {
      console.error("Error publishing assignment:", error);
      setError("Failed to publish assignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push(`/dashboard/courses/${courseId}/manage?tab=assignments`);
  };
  console.log("From Form:", userToken);
  return (
    <div className="space-y-8">
      {/* Assignment Status */}
      <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {assignment.title}
              </h2>
              {!isDraft ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  Published
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="bg-yellow-500 text-white hover:bg-yellow-600"
                >
                  Draft
                </Badge>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={handleBack}>
                Back to Assignments
              </Button>
              {isDraft && assignmentQuestions.length > 0 && (
                <Button
                  onClick={handlePublish}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? "Publishing..." : "Publish Assignment"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Assignment Details</TabsTrigger>
          <TabsTrigger value="questions">
            Question ({assignmentQuestions.length})
          </TabsTrigger>
        </TabsList>

        {/* Assignment Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card className="border border-gray-200 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
              <CardTitle className="text-2xl font-bold text-white flex items-center">
                <svg
                  className="w-7 h-7 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit Assignment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 py-8">
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label
                    htmlFor="title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    AssignmentsTitle *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg h-12"
                    disabled={loading}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-lg font-semibold text-gray-900"
                  >
                    AssignmentsDescription *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[200px] text-base leading-relaxed resize-y"
                    disabled={loading}
                  />
                  {description && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        Preview
                      </Label>
                      <div className="border rounded-md p-3 bg-gray-50 max-h-32 overflow-y-auto overflow-x-hidden w-full min-w-0">
                        <Markdown
                          content={description}
                          className="prose prose-sm max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleUpdateAssignment}
                  disabled={loading || !title.trim() || !description.trim()}
                  className="w-full py-3 text-lg"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          {/* Create New Question */}
          <Card className="border border-green-200 bg-green-50 rounded-xl overflow-hidden">
            <CardContent className="px-6 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Create New Question
                  </h3>
                  <p className="text-green-800">Add a new question to this assignment</p>
                </div>
                <CreateAssignmentQuestionForm
                  courseId={courseId}
                  assignmentId={assignment.id}
                  userToken={userToken}
                  onSuccess={loadAssignmentQuestions}
                  trigger={
                    <Button className="bg-green-600 hover:bg-green-700">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      CreateQuestion
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Current Questions */}
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold text-gray-900">
                AssignmentsQuestion ({assignmentQuestions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {questionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="animate-spin h-6 w-6 text-gray-500 mr-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Loading questions...
                </div>
              ) : assignmentQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    No Questions Added
                  </h4>
                  <p className="text-gray-600">
                    Use the button above to create new questions for this assignment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignmentQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500">
                              Q{index + 1}
                            </span>
                            <h4 className="text-lg font-semibold text-gray-900">
                              {question.title}
                            </h4>
                          </div>
                          <div
                            className="text-gray-600 text-sm mb-2"
                            style={{
                              wordBreak: "break-word",
                              overflowWrap: "anywhere",
                              hyphens: "auto",
                            }}
                          >
                            <Markdown
                              content={question.informalDescription}
                              className="prose-sm max-w-none"
                            />
                          </div>
                          {question.formalDescription && (
                            <div
                              className="mt-2 max-w-full"
                              style={{
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                hyphens: "auto",
                              }}
                            >
                              <Label className="text-sm font-semibold text-gray-900 mb-2 block">
                                Formal Description
                              </Label>
                              <div
                                className="max-w-full"
                                style={{
                                  wordBreak: "break-word",
                                  overflowWrap: "anywhere",
                                  hyphens: "auto",
                                }}
                              >
                                <CodeBlock
                                  code={question.formalDescription}
                                  language="lean4"
                                  className="text-sm max-w-full"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <EditAssignmentQuestionForm
                            question={question}
                            userToken={userToken}
                            onSuccess={loadAssignmentQuestions}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="EditQuestion"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                <span className="ml-1">Edit</span>
                              </Button>
                            }
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="DeleteQuestion"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                            <span className="ml-1">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
