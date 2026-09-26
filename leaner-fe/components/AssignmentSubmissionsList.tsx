"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  FileText,
  Search,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import GradeAssignmentAnswerForm from "./GradeAssignmentAnswerForm";
import { listAssignmentAnswers, returnAssignmentAnswer, batchReturnAssignmentAnswers } from "@/lib/grpc";
import {
  ListAssignmentAnswersRequest,
  ReturnAssignmentAnswerRequest,
  BatchReturnAssignmentAnswersRequest,
  AssignmentAnswer,
  AssignmentQuestion,
  AssignmentGrade,
} from "@/lib/gen/leaner/v1/leaner_pb";

interface AssignmentSubmissionsListProps {
  assignmentId: string;
  userToken: string;
  questions: AssignmentQuestion[];
  userIdToName: Map<string, string>;
}

interface SubmissionWithDetails extends AssignmentAnswer {
  questionTitle?: string;
  authorName?: string;
}

interface GroupedSubmissions {
  userId: string;
  userName: string;
  submissions: SubmissionWithDetails[];
  gradedCount: number;
  totalCount: number;
}

export default function AssignmentSubmissionsList({
  assignmentId,
  userToken,
  questions,
  userIdToName,
}: AssignmentSubmissionsListProps) {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestion, setSelectedQuestion] = useState<string>("all");
  const [gradingFilter, setGradingFilter] = useState<string>("all");
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [returningSet, setReturningSet] = useState<Set<string>>(new Set());
  const [returningAll, setReturningAll] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingPage, setLoadingPage] = useState(false);

  const loadSubmissions = async (page: number = 1) => {
    setLoadingPage(true);
    try {
      // Load all submissions for all questions in this assignment with pagination
      const allSubmissions: SubmissionWithDetails[] = [];
      let totalSubmissions = 0;

      for (const question of questions) {
        const answersRequest = {
          pageSize: 50, // Load more per question to get better pagination
          pageToken: page.toString(),
          userToken: userToken,
          assignmentQuestionId: question.id,
          excludeDrafts: true, // Only show submitted answers
        } as ListAssignmentAnswersRequest;

        try {
          const answersResponse = await listAssignmentAnswers(answersRequest);
          const answers = answersResponse.answers || [];
          totalSubmissions += answersResponse.totalCount || 0;

          // Add question title and author name to each submission
          const submissionsWithDetails: SubmissionWithDetails[] = answers.map(
            (answer) => ({
              ...answer,
              questionTitle: question.title,
              authorName: userIdToName.get(answer.authorId) || "Unknown User",
            }),
          );

          allSubmissions.push(...submissionsWithDetails);
        } catch (error) {
          console.error(
            `Error loading answers for question ${question.id}:`,
            error,
          );
        }
      }

      setSubmissions(allSubmissions);
      setTotalPages(Math.ceil(totalSubmissions / 50)); // Assuming 50 per page
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoadingPage(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await loadSubmissions(1);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      loadData();
    }
  }, [assignmentId, userToken, questions]);

  const handlePageChange = (page: number) => {
    loadSubmissions(page);
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
           {currentPage} of {totalPages}
        </div>
      </div>
    );
  };

  const handleGraded = (answerId: string, grade: AssignmentGrade) => {
    setSubmissions((prev) =>
      prev.map((submission) =>
        submission.id === answerId
          ? { ...submission, grades: [grade] }
          : submission,
      ),
    );
    toast.success("Grade saved successfully!");
  };

  const handleReturn = async (answerId: string) => {
    setReturningSet((prev) => new Set(prev).add(answerId));
    try {
      await returnAssignmentAnswer({
        answerId,
        userToken,
      } as ReturnAssignmentAnswerRequest);
      toast.success("Answer returned to student for revision");
      // Remove from local list
      setSubmissions((prev) => prev.filter((s) => s.id !== answerId));
    } catch {
      toast.error("Failed to return answer");
    } finally {
      setReturningSet((prev) => { const n = new Set(prev); n.delete(answerId); return n; });
    }
  };

  const handleReturnAll = async () => {
    if (!confirm("Return ALL submissions for this assignment to students? Students will be able to resubmit.")) return;
    setReturningAll(true);
    try {
      let count = 0;
      for (const question of questions) {
        const resp = await batchReturnAssignmentAnswers({
          assignmentQuestionId: question.id,
          userToken,
        } as BatchReturnAssignmentAnswersRequest);
        count += resp.count;
      }
      toast.success(`Returned ${count} submission(s) to students`);
      loadSubmissions(currentPage);
    } catch {
      toast.error("Failed to return all submissions");
    } finally {
      setReturningAll(false);
    }
  };

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
    submissions: SubmissionWithDetails[],
  ): GroupedSubmissions[] => {
    const grouped = submissions.reduce(
      (acc, submission) => {
        const userId = submission.authorId;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            userName: submission.authorName || "Unknown User",
            submissions: [],
            gradedCount: 0,
            totalCount: 0,
          };
        }
        acc[userId].submissions.push(submission);
        acc[userId].totalCount++;
        if (submission.grades && submission.grades.length > 0) {
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

  // Filter submissions based on search term, question, and grading status
  const filteredSubmissions = submissions.filter((submission) => {
    const matchesSearch =
      !searchTerm ||
      submission.questionTitle
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      submission.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.informalAnswer
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesQuestion =
      selectedQuestion === "all" ||
      submission.assignmentQuestionId === selectedQuestion;

    const matchesGrading =
      gradingFilter === "all" ||
      (gradingFilter === "graded" &&
        submission.grades &&
        submission.grades.length > 0) ||
      (gradingFilter === "ungraded" &&
        (!submission.grades || submission.grades.length === 0));

    return matchesSearch && matchesQuestion && matchesGrading;
  });

  // Group filtered submissions by user
  const groupedSubmissions = groupSubmissionsByUser(filteredSubmissions);

  const gradedCount = submissions.filter(
    (s) => s.grades && s.grades.length > 0,
  ).length;
  const ungradedCount = submissions.length - gradedCount;

  if (loading) {
    return (
      <Card className="border border-gray-200 shadow-sm rounded-xl">
        <CardContent className="px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-lg">Loading submissions...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-blue-200 bg-blue-50">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-blue-600 font-medium">Total Submissions</div>
                <div className="text-2xl font-bold text-blue-900">
                  {submissions.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-green-200 bg-green-50">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm text-green-600 font-medium">Graded</div>
                <div className="text-2xl font-bold text-green-900">
                  {gradedCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm text-orange-600 font-medium">
                  Pending Grading
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {ungradedCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-gray-200 shadow-sm rounded-xl">
        <CardHeader className="px-6 py-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Filter Submissions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label
                htmlFor="search"
                className="text-sm font-medium text-gray-700"
              >
                Search
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search submissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label
                htmlFor="question"
                className="text-sm font-medium text-gray-700"
              >
                Question
              </Label>
              <select
                id="question"
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Questions</option>
                {questions.map((question) => (
                  <option key={question.id} value={question.id}>
                    {question.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label
                htmlFor="grading"
                className="text-sm font-medium text-gray-700"
              >
                Grading Status
              </Label>
              <select
                id="grading"
                value={gradingFilter}
                onChange={(e) => setGradingFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Submissions</option>
                <option value="graded">Graded</option>
                <option value="ungraded">Pending Grading</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return All Button */}
      {groupedSubmissions.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReturnAll}
            disabled={returningAll}
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
          >
            {returningAll ? "Returning..." : "Return All Submissions"}
          </Button>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-4">
        {groupedSubmissions.length === 0 ? (
          <Card className="border border-gray-200 shadow-sm rounded-xl">
            <CardContent className="px-6 py-12">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  No Submissions
                </h4>
                <p className="text-gray-600">
                  {submissions.length === 0
                    ? "This assignment has no submissions yet."
                    : "No submissions match your current filter."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          groupedSubmissions.map((userGroup) => (
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
                        {userGroup.gradedCount}/{userGroup.totalCount} Question
                        Graded
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        const answerIds = submissions
                          .filter(s => s.authorId === userGroup.userId)
                          .map(s => s.id);
                        answerIds.forEach(id => handleReturn(id));
                      }}
                      disabled={returningSet.size > 0}
                      className="text-amber-600 hover:text-amber-800 hover:bg-amber-50 text-xs"
                    >
                      Return
                    </Button>
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
                  <div className="space-y-4">
                    {userGroup.submissions.map((submission) => (
                      <GradeAssignmentAnswerForm
                        key={submission.id}
                        answer={submission}
                        userToken={userToken}
                        onGraded={(grade) => handleGraded(submission.id, grade)}
                        existingGrade={
                          submission.grades && submission.grades.length > 0
                            ? submission.grades[0]
                            : undefined
                        }
                        questionTitle={submission.questionTitle}
                        authorName={submission.authorName}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {submissions.length > 0 && totalPages > 1 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <CustomPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={loadingPage}
          />
        </div>
      )}
    </div>
  );
}
