"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import {
  Send,
  CheckCircle,
  Users,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import AssignmentSubmissionsList from "./AssignmentSubmissionsList";
import {
  listAssignmentQuestions,
  listAssignmentAnswers,
  updateAssignmentAnswer,
  listUsers,
} from "@/lib/grpc";
import {
  ListAssignmentQuestionsRequest,
  ListAssignmentAnswersRequest,
  UpdateAssignmentAnswerRequest,
  ListUsersRequest,
  Assignment,
  AssignmentQuestion,
  AssignmentAnswer,
  AssignmentGrade,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";

interface AssignmentAnswerWithGrade extends AssignmentAnswer {
  grades: AssignmentGrade[];
  authorName?: string;
}

interface GroupedSubmissions {
  userId: string;
  userName: string;
  submissions: AssignmentAnswerWithGrade[];
  gradedCount: number;
  totalCount: number;
}

interface AssignmentViewProps {
  assignment: Assignment;
  courseId: string;
  userToken: string;
  userRole: number;
}

export default function AssignmentView({
  assignment,
  courseId,
  userToken,
  userRole,
}: AssignmentViewProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<AssignmentAnswerWithGrade[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Pagination state
  const [questionsPage, setQuestionsPage] = useState(1);
  const [questionsTotalPages, setQuestionsTotalPages] = useState(1);
  const [answersPage, setAnswersPage] = useState(1);
  const [answersTotalPages, setAnswersTotalPages] = useState(1);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  const isTeacherOrAdmin = userRole === 1 || userRole === 2;
  const isInstructor = userRole === 1 || userRole === 2 || userRole === 3; // Admin, Teacher, or Assistant

  // Utility function to get verification status display properties
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

  useEffect(() => {
    loadData();
  }, []);

  // Reload answers when questions change
  useEffect(() => {
    if (questions.length > 0) {
      loadAnswers(1);
    }
  }, [questions]);

  // Helper function to check if a question has been answered
  const getAnswerForQuestion = (questionId: string) => {
    return userAnswers.find(
      (answer) => answer.assignmentQuestionId === questionId,
    );
  };

  // Check if all questions have been answered
  const getAllAnsweredQuestions = () => {
    return questions.filter((question) => getAnswerForQuestion(question.id));
  };

  const allQuestionsAnswered =
    questions.length > 0 &&
    getAllAnsweredQuestions().length === questions.length;

  // Check if assignment has been submitted (all answers are not drafts)
  const isAssignmentSubmitted =
    userAnswers.length > 0 && userAnswers.every((answer) => !answer.isDraft);

  // Count submitted (non-draft) answers
  const submittedAnswersCount = userAnswers.filter(
    (answer) => !answer.isDraft,
  ).length;

  // Group submissions by user for instructors
  const toggleUserExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const groupSubmissionsByUser = (
    answers: AssignmentAnswerWithGrade[],
  ): GroupedSubmissions[] => {
    const grouped = answers.reduce(
      (acc, answer) => {
        const userId = answer.authorId;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            userName: answer.authorName || `User ${userId.slice(0, 8)}`, // Use actual name or fallback
            submissions: [],
            gradedCount: 0,
            totalCount: 0,
          };
        }
        acc[userId].submissions.push(answer);
        acc[userId].totalCount++;
        if (answer.grades && answer.grades.length > 0) {
          acc[userId].gradedCount++;
        }
        return acc;
      },
      {} as Record<string, GroupedSubmissions>,
    );
    return Object.values(grouped).sort((a, b) =>
      a.userName.localeCompare(b.userName),
    );
  };

  // Submit entire assignment (make all answers public)
  const handleSubmitAssignment = async () => {
    if (!allQuestionsAnswered) {
      toast.error("Please answer all questions before submitting the assignment");
      return;
    }

    if (isAssignmentSubmitted) {
      toast.error("Assignment has already been submitted");
      return;
    }

    try {
      setSubmittingAssignment(true);

      console.log("Submitting assignment with answers:", userAnswers);

      // Update all draft answers to be non-draft
      const draftAnswers = userAnswers.filter((answer) => answer.isDraft);
      console.log("Draft answers to update:", draftAnswers);

      if (draftAnswers.length === 0) {
        toast.error("No draft answers found to submit");
        return;
      }

      const updatePromises = draftAnswers.map(async (answer) => {
        const updateRequest = {
          answerId: answer.id,
          userToken: userToken,
          isDraft: false, // Make it public
        } as UpdateAssignmentAnswerRequest;

        console.log("Updating answer:", answer.id, "to non-draft");
        return updateAssignmentAnswer(updateRequest);
      });

      await Promise.all(updatePromises);
      toast.success("Assignment submitted successfully! All answers are now final.");

      // Reload data to reflect changes
      await loadData();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      toast.error("Failed to submit assignment. Please try again.");
    } finally {
      setSubmittingAssignment(false);
    }
  };

  // Load users for name mapping (only if instructor)
  const [userIdToName, setUserIdToName] = useState<Map<string, string>>(
    new Map(),
  );

  const loadUsers = async () => {
    if (!isInstructor) return;

    try {
      const usersRequest = {
        pageSize: 1000,
        pageToken: "0",
      } as ListUsersRequest;

      const usersResponse = await listUsers(usersRequest);
      const loadedUsers = usersResponse.users || [];

      // Create user ID to name mapping
      const userMap = new Map<string, string>();
      loadedUsers.forEach((user) => {
        userMap.set(user.id, user.username);
      });
      setUserIdToName(userMap);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadQuestions = async (page: number = 1) => {
    setLoadingQuestions(true);
    try {
      const questionsRequest = {
        assignmentId: assignment.id,
        userToken: userToken,
        pageSize: 10, // Smaller page size for better UX
        pageToken: page.toString(),
      } satisfies Partial<ListAssignmentQuestionsRequest>;

      const questionsResponse = await listAssignmentQuestions(
        questionsRequest as ListAssignmentQuestionsRequest,
      );
      setQuestions(questionsResponse.questions);
      setQuestionsTotalPages(
        Math.ceil((questionsResponse.totalCount || 0) / 10),
      );
      setQuestionsPage(page);
    } catch (error) {
      console.error("Error loading questions:", error);
      setError("Failed to load questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadAnswers = async (page: number = 1) => {
    setLoadingAnswers(true);
    try {
      const answersRequest = {
        userToken: userToken,
        pageSize: 20, // Smaller page size for better UX
        pageToken: page.toString(),
        excludeDrafts: false, // Include all answers (drafts and submitted) for proper counting
      } satisfies Partial<ListAssignmentAnswersRequest>;

      const answersResponse = await listAssignmentAnswers(
        answersRequest as ListAssignmentAnswersRequest,
      );

      // Filter answers for this assignment's questions
      const questionIds = new Set(questions.map((q) => q.id));
      const relevantAnswers = (answersResponse.answers || []).filter((answer) =>
        questionIds.has(answer.assignmentQuestionId),
      );

      // Add author names to answers
      const answersWithNames: AssignmentAnswerWithGrade[] = relevantAnswers.map(
        (answer) => ({
          ...answer,
          authorName:
            userIdToName.get(answer.authorId) ||
            `User ${answer.authorId.slice(0, 8)}`,
        }),
      );

      setUserAnswers(answersWithNames);
      setAnswersTotalPages(Math.ceil((answersResponse.totalCount || 0) / 20));
      setAnswersPage(page);
    } catch (error) {
      console.error("Error loading answers:", error);
      setError("Failed to load answers");
    } finally {
      setLoadingAnswers(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await loadUsers();
      await loadQuestions(1);
      // loadAnswers will be called automatically by useEffect when questions are loaded
    } catch (error) {
      console.error("Error loading assignment data:", error);
      setError("Failed to load assignment data");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (isTeacherOrAdmin) {
      router.push(`/dashboard/courses/${courseId}/manage?tab=assignments`);
    } else {
      router.push(`/dashboard/courses/${courseId}`);
    }
  };

  const handleQuestionsPageChange = (page: number) => {
    loadQuestions(page);
    // loadAnswers will be called automatically by useEffect when questions are updated
  };

  const handleAnswersPageChange = (page: number) => {
    loadAnswers(page);
  };

  // Custom pagination component using shadcn/ui
  const CustomPagination = ({
    currentPage,
    totalPages,
    onPageChange,
    isLoading = false,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    isLoading?: boolean;
  }) => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const pages: (number | string)[] = [];
      const maxVisiblePages = 5;

      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);

        if (currentPage > 3) {
          pages.push("...");
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let i = start; i <= end; i++) {
          if (i !== 1 && i !== totalPages) {
            pages.push(i);
          }
        }

        if (currentPage < totalPages - 2) {
          pages.push("...");
        }

        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }

      return pages;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="flex items-center justify-between">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1 && !isLoading) {
                    onPageChange(currentPage - 1);
                  }
                }}
                className={
                  currentPage === 1 || isLoading
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {visiblePages.map((page, index) => (
              <PaginationItem key={index}>
                {page === "..." ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!isLoading) {
                        onPageChange(page as number);
                      }
                    }}
                    isActive={currentPage === page}
                    className={
                      isLoading
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages && !isLoading) {
                    onPageChange(currentPage + 1);
                  }
                }}
                className={
                  currentPage === totalPages || isLoading
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>

        <div className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    );
  };

  const handleEdit = () => {
    router.push(
      `/dashboard/courses/${courseId}/assignments/${assignment.id}/edit`,
    );
  };

  return (
    <div className="space-y-8">
      {/* Assignment Header */}
      <Card className="border border-gray-200 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <CardTitle className="text-3xl font-bold text-white mb-2">
                  {assignment.title}
                </CardTitle>
                <div className="flex items-center space-x-3">
                  {assignment.isDraft ? (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-500 text-white hover:bg-yellow-600"
                    >
                      Draft
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      Published
                    </Badge>
                  )}
                  <span className="text-blue-100 text-sm">
                    {questions.length} Questions
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleBack}
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
              >
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back
              </Button>

              {isTeacherOrAdmin && (
                <Button
                  onClick={handleEdit}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit Assignment
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {assignment.description && (
          <CardContent className="px-8 py-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Assignment Description
              </h3>
              <Markdown
                content={assignment.description}
                className="prose max-w-none"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Assignment Button for Students */}
      {!isTeacherOrAdmin && !assignment.isDraft && (
        <Card
          className={`rounded-xl overflow-hidden ${
            isAssignmentSubmitted
              ? "border border-blue-200 bg-blue-50"
              : "border border-green-200 bg-green-50"
          }`}
        >
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3
                  className={`text-lg font-semibold mb-2 ${
                    isAssignmentSubmitted ? "text-blue-900" : "text-green-900"
                  }`}
                >
                  {isAssignmentSubmitted ? "Assignment Submitted" : "Submit Assignment"}
                </h3>
                <p
                  className={`text-sm ${
                    isAssignmentSubmitted ? "text-blue-800" : "text-green-800"
                  }`}
                >
                  {isAssignmentSubmitted
                    ? "Your assignment has been submitted successfully. All answers are final."
                    : allQuestionsAnswered
                      ? "All questions answered! You can now submit the assignment."
                      : `Please answer all questions (${getAllAnsweredQuestions().length}/${questions.length} answered) to submit the assignment.`}
                </p>
                {allQuestionsAnswered && !isAssignmentSubmitted && (
                  <p className="text-green-700 text-xs mt-1">
                    ⚠️ After submission, you will not be able to edit your answers.
                  </p>
                )}
              </div>
              {isAssignmentSubmitted ? (
                <div className="flex items-center text-blue-600">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span className="font-semibold">Submitted</span>
                </div>
              ) : (
                <Button
                  onClick={handleSubmitAssignment}
                  disabled={!allQuestionsAnswered || submittingAssignment}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                >
                  {submittingAssignment ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Assignment
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Content */}
      <Tabs defaultValue="questions" className="w-full">
        <TabsList
          className={`grid w-full ${isInstructor ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <TabsTrigger value="questions">Question</TabsTrigger>
          <TabsTrigger value="submissions">
            {isInstructor ? "All Submissions" : "My Submissions"}
          </TabsTrigger>
          {isInstructor && (
            <TabsTrigger value="grading">
              <Users className="w-4 h-4 mr-2" />
              Grade Submissions
            </TabsTrigger>
          )}
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold text-gray-900">
                Assignment Questions ({questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {loading ? (
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
              ) : error ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Error Loading Questions
                  </h4>
                  <p className="text-gray-600 mb-4">{error}</p>
                  <Button onClick={loadData} variant="outline">
                    Retry
                  </Button>
                </div>
              ) : questions.length === 0 ? (
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
                    No Questions
                  </h4>
                  <p className="text-gray-600">This assignment does not have any questions yet.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {questions.map((question, index) => {
                    const userAnswer = getAnswerForQuestion(question.id);
                    const hasAnswer = !!userAnswer;

                    return (
                      <Card
                        key={question.id}
                        className="border border-gray-200 rounded-lg overflow-hidden"
                      >
                        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge
                                variant="outline"
                                className="text-sm font-medium"
                              >
                                Q{index + 1}
                              </Badge>
                              <CardTitle className="text-xl font-semibold text-gray-900">
                                {question.title}
                              </CardTitle>
                              {/* Answer status for students */}
                              {!isTeacherOrAdmin && hasAnswer && (
                                <Badge
                                  variant="secondary"
                                  className="bg-green-100 text-green-700 border-green-300"
                                >
                                  ✓ Answered
                                </Badge>
                              )}
                            </div>
                            {!isTeacherOrAdmin && !assignment.isDraft && (
                              <Button
                                onClick={() =>
                                  router.push(
                                    `/dashboard/courses/${courseId}/assignments/${assignment.id}/questions/${question.id}/submit`,
                                  )
                                }
                                disabled={isAssignmentSubmitted}
                                className={
                                  isAssignmentSubmitted
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : hasAnswer
                                      ? "bg-orange-600 hover:bg-orange-700"
                                      : "bg-blue-600 hover:bg-blue-700"
                                }
                              >
                                <Send className="w-4 h-4 mr-2" />
                                {isAssignmentSubmitted
                                  ? "Submitted"
                                  : hasAnswer
                                    ? "Edit Answer"
                                    : "Submit Answer"}
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="px-6 py-6">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                Question
                              </h4>
                              <div className="prose max-w-none">
                                <Markdown
                                  content={question.informalDescription}
                                />
                              </div>
                            </div>

                            {question.formalDescription && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Formal Question
                                </h4>
                                <CodeBlock
                                  code={question.formalDescription}
                                  language="lean4"
                                />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Questions Pagination */}
              {questions.length > 0 && questionsTotalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <CustomPagination
                    currentPage={questionsPage}
                    totalPages={questionsTotalPages}
                    onPageChange={handleQuestionsPageChange}
                    isLoading={loadingQuestions}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" className="space-y-6">
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
              <CardTitle className="text-xl font-bold text-gray-900">
                {isInstructor
                  ? `All Submissions (${userAnswers.length})`
                  : `My Submissions (${submittedAnswersCount}/${questions.length})`}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-lg">Loading submissions...</div>
                </div>
              ) : submittedAnswersCount === 0 ? (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    No Submissions
                  </h4>
                  <p className="text-gray-600">
                    You have not submitted any answers for this assignment yet.
                  </p>
                </div>
              ) : isInstructor ? (
                // Grouped view for instructors
                <div className="space-y-4">
                  {groupSubmissionsByUser(userAnswers).map((userGroup) => (
                    <Card
                      key={userGroup.userId}
                      className="border border-gray-200 shadow-sm rounded-xl"
                    >
                      <CardHeader
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleUserExpanded(userGroup.userId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold text-gray-900">
                                {userGroup.userName}
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                {userGroup.gradedCount}/{userGroup.totalCount}{" "}
                                QuestionGraded
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  userGroup.gradedCount === userGroup.totalCount
                                    ? "bg-green-500"
                                    : userGroup.gradedCount > 0
                                      ? "bg-yellow-500"
                                      : "bg-gray-300"
                                }`}
                              />
                              <span className="text-xs text-gray-500">
                                {userGroup.gradedCount === userGroup.totalCount
                                  ? "Graded"
                                  : userGroup.gradedCount > 0
                                    ? "Partially Graded"
                                    : "Pending Grading"}
                              </span>
                            </div>
                            {expandedUsers.has(userGroup.userId) ? (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {expandedUsers.has(userGroup.userId) && (
                        <CardContent className="pt-0">
                          <div className="space-y-6">
                            {userGroup.submissions.map((userAnswer, index) => {
                              const question = questions.find(
                                (q) => q.id === userAnswer.assignmentQuestionId,
                              );
                              if (!question) return null;

                              return (
                                <Card
                                  key={userAnswer.id}
                                  className="border border-gray-200 rounded-lg overflow-hidden"
                                >
                                  <CardHeader className="bg-gray-50 px-6 py-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-semibold text-blue-600">
                                            {index + 1}
                                          </span>
                                        </div>
                                        <div>
                                          <h3 className="text-lg font-semibold text-gray-900">
                                            {question.title}
                                          </h3>
                                          <p className="text-sm text-gray-600">
                                            {question.informalDescription?.substring(
                                              0,
                                              100,
                                            )}
                                            ...
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Badge
                                          variant="secondary"
                                          className={
                                            userAnswer.isDraft
                                              ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                              : "bg-green-100 text-green-800 border-green-300"
                                          }
                                        >
                                          {userAnswer.isDraft
                                            ? "Draft"
                                            : "Submitted"}
                                        </Badge>
                                        {userAnswer.formalAnswer && (
                                          <Badge
                                            variant="secondary"
                                            className={
                                              getVerificationStatusDisplay(
                                                userAnswer.verificationStatus,
                                              ).className
                                            }
                                          >
                                            {
                                              getVerificationStatusDisplay(
                                                userAnswer.verificationStatus,
                                              ).icon
                                            }{" "}
                                            {
                                              getVerificationStatusDisplay(
                                                userAnswer.verificationStatus,
                                              ).text
                                            }
                                          </Badge>
                                        )}
                                        {/* Show grade if available */}
                                        {userAnswer.grades &&
                                          userAnswer.grades.length > 0 && (
                                            <Badge
                                              variant="secondary"
                                              className="bg-blue-100 text-blue-800 border-blue-300"
                                            >
                                              <Star className="w-4 h-4 mr-1" />
                                              Grade:{" "}
                                              {userAnswer.grades[0].grade}/100
                                            </Badge>
                                          )}
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="px-6 py-6">
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                          Natural Language Answer:
                                        </h4>
                                        <div className="bg-gray-50 rounded-lg p-4">
                                          <Markdown
                                            content={userAnswer.informalAnswer}
                                          />
                                        </div>
                                      </div>
                                      {userAnswer.formalAnswer && (
                                        <div>
                                          <h4 className="text-sm font-medium text-gray-700 mb-2">
                                            Formal Answer:
                                          </h4>
                                          <div className="bg-gray-50 rounded-lg p-4">
                                            <CodeBlock
                                              code={userAnswer.formalAnswer}
                                              language="lean"
                                            />
                                          </div>
                                        </div>
                                      )}

                                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                        Last updated:{" "}
                                        {new Date(
                                          userAnswer.updatedAt,
                                        ).toLocaleString()}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                // Individual view for students
                <div className="space-y-6">
                  {questions
                    .filter((question) => {
                      const userAnswer = getAnswerForQuestion(question.id);
                      return userAnswer && !userAnswer.isDraft;
                    })
                    .map((question, index) => {
                      const userAnswer = getAnswerForQuestion(question.id);

                      return (
                        <Card
                          key={question.id}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <CardHeader className="bg-gray-50 px-6 py-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className="text-sm font-medium"
                                >
                                  Q{index + 1}
                                </Badge>
                                <CardTitle className="text-lg font-semibold text-gray-900">
                                  {question.title}
                                </CardTitle>
                                {userAnswer ? (
                                  <>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        userAnswer.isDraft
                                          ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                          : "bg-green-100 text-green-700 border-green-300"
                                      }
                                    >
                                      {userAnswer.isDraft ? "Draft" : "Submitted"}
                                    </Badge>
                                    {userAnswer.formalAnswer && (
                                      <Badge
                                        variant="secondary"
                                        className={
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).className
                                        }
                                      >
                                        {
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).icon
                                        }{" "}
                                        {
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).text
                                        }
                                      </Badge>
                                    )}
                                    {/* Show grade if available */}
                                    {userAnswer.grades &&
                                      userAnswer.grades.length > 0 && (
                                        <Badge
                                          variant="secondary"
                                          className="bg-blue-100 text-blue-800 border-blue-300"
                                        >
                                          <Star className="w-4 h-4 mr-1" />
                                          Grade: {userAnswer.grades[0].grade}
                                          /100
                                        </Badge>
                                      )}
                                  </>
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="bg-gray-100 text-gray-700 border-gray-300"
                                  >
                                    Not Answered
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-6 py-6">
                            {userAnswer ? (
                              <div className="space-y-4">
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                    Your Answer
                                  </h4>
                                  <div className="prose max-w-none">
                                    <Markdown
                                      content={userAnswer.informalAnswer}
                                    />
                                  </div>
                                </div>

                                {userAnswer.formalAnswer && (
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                      Formal Answer
                                    </h4>
                                    <CodeBlock
                                      code={userAnswer.formalAnswer}
                                      language="lean4"
                                    />
                                  </div>
                                )}

                                {userAnswer.formalAnswer && (
                                  <div className="bg-gray-50 rounded-lg p-4 border">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                      VerificationStatus
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant="secondary"
                                        className={
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).className
                                        }
                                      >
                                        {
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).icon
                                        }{" "}
                                        {
                                          getVerificationStatusDisplay(
                                            userAnswer.verificationStatus,
                                          ).text
                                        }
                                      </Badge>
                                      <span className="text-sm text-gray-600">
                                        {userAnswer.verificationStatus ===
                                          AnswerVerificationStatus.PENDING &&
                                          "Your formal answer is being verified..."}
                                        {userAnswer.verificationStatus ===
                                          AnswerVerificationStatus.SUCCESSFUL &&
                                          "Your formal answer has been verified successfully!"}
                                        {userAnswer.verificationStatus ===
                                          AnswerVerificationStatus.FAILED &&
                                          "Your formal answer could not be verified. Please check for errors."}
                                        {userAnswer.verificationStatus ===
                                          AnswerVerificationStatus.FAILED && (
                                          <a
                                            href={`/dashboard/courses/${courseId}/assignments/${assignment.id}/questions/${question.id}/submit`}
                                            className="inline-flex items-center ml-3 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium hover:bg-amber-200 transition-colors"
                                          >
                                            Revise & Resubmit
                                          </a>
                                        )}
                                        {userAnswer.verificationStatus ===
                                          AnswerVerificationStatus.NOT_APPLICABLE &&
                                          "Verification is not applicable for this answer."}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                  Last updated:{" "}
                                  {new Date(
                                    userAnswer.updatedAt,
                                  ).toLocaleString()}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-gray-600">
                                  No answer has been submitted for this question.
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}

              {/* Submissions Pagination */}
              {userAnswers.length > 0 && answersTotalPages > 1 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <CustomPagination
                    currentPage={answersPage}
                    totalPages={answersTotalPages}
                    onPageChange={handleAnswersPageChange}
                    isLoading={loadingAnswers}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grading Tab - Only for instructors */}
        {isInstructor && (
          <TabsContent value="grading" className="space-y-6">
            <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-100">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6" />
                  Grade Student Submissions
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 py-6">
                <AssignmentSubmissionsList
                  assignmentId={assignment.id}
                  userToken={userToken}
                  questions={questions}
                  userIdToName={userIdToName}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
