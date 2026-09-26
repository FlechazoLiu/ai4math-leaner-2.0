"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Question,
  ListQuestionsRequest,
  DeleteQuestionRequest,
  MathDifficulty,
  LeanDifficulty,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listQuestions, deleteQuestion } from "@/lib/grpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import CreateQuestionForm from "@/components/CreateQuestionForm";
import EditQuestionForm from "@/components/EditQuestionForm";
import Link from "next/link";

export default function MyExercisePage() {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and pagination state
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [titleFilter, setTitleFilter] = useState<string>("");
  const [debouncedTitleFilter, setDebouncedTitleFilter] = useState<string>("");

  // Check if user can modify questions (admin, teacher, assistant)
  const canModifyQuestions =
    session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Debounce title filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTitleFilter(titleFilter);
      setCurrentPage(1); // Reset to first page when filter changes
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [titleFilter]);

  useEffect(() => {
    if (session?.user?.id) {
      loadQuestions();
    }
  }, [session?.user?.id, debouncedTitleFilter, pageSize, currentPage]);

  const loadQuestions = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const request = {
        pageSize,
        pageToken: currentPage.toString(),
        authorId: session.user.id, // Filter by current user
      } as ListQuestionsRequest;

      // Add title filter if specified
      if (debouncedTitleFilter.trim()) {
        request.titleFilter = debouncedTitleFilter.trim();
      }

      const response = await listQuestions(request);
      setQuestions(response.questions);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load exercises");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (
    questionId: string,
    questionTitle: string,
  ) => {
    if (!session?.user?.token) {
      toast.error("Authentication required");
      return;
    }

    if (!canModifyQuestions) {
      toast.error("Insufficient permissions.");
      return;
    }

    if (!confirm(`Are you sure you want to deleteQuestion "${questionTitle}"?`)) {
      return;
    }

    try {
      const request = {
        id: questionId,
        userToken: session.user.token,
      } as DeleteQuestionRequest;

      await deleteQuestion(request);
      toast.success("Question deleted");
      loadQuestions();
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (newPageSize > 0 && newPageSize <= 100) {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when changing page size
    }
  };

  const clearFilters = () => {
    setTitleFilter("");
    setDebouncedTitleFilter("");
    setPageSize(10);
    setCurrentPage(1);
  };

  const getMathDifficultyDisplayName = (difficulty: MathDifficulty) => {
    switch (difficulty) {
      case MathDifficulty.SIMP:
        return "Simp";
      case MathDifficulty.EASY:
        return "Easy";
      case MathDifficulty.MEDIUM:
        return "Medium";
      case MathDifficulty.HARD:
        return "Hard";
      case MathDifficulty.SORRY:
        return "Sorry";
      default:
        return "Unspecified";
    }
  };

  const getLeanDifficultyDisplayName = (difficulty: LeanDifficulty) => {
    switch (difficulty) {
      case LeanDifficulty.SIMP:
        return "Simp";
      case LeanDifficulty.EASY:
        return "Easy";
      case LeanDifficulty.MEDIUM:
        return "Medium";
      case LeanDifficulty.HARD:
        return "Hard";
      case LeanDifficulty.SORRY:
        return "Sorry";
      default:
        return "Unspecified";
    }
  };

  const getMathDifficultyColor = (difficulty: MathDifficulty) => {
    switch (difficulty) {
      case MathDifficulty.SIMP:
        return "bg-green-100 text-green-700 border-green-300";
      case MathDifficulty.EASY:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case MathDifficulty.MEDIUM:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case MathDifficulty.HARD:
        return "bg-orange-100 text-orange-700 border-orange-300";
      case MathDifficulty.SORRY:
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getLeanDifficultyColor = (difficulty: LeanDifficulty) => {
    switch (difficulty) {
      case LeanDifficulty.SIMP:
        return "bg-green-100 text-green-700 border-green-300";
      case LeanDifficulty.EASY:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case LeanDifficulty.MEDIUM:
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case LeanDifficulty.HARD:
        return "bg-orange-100 text-orange-700 border-orange-300";
      case LeanDifficulty.SORRY:
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!canModifyQuestions) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Insufficient Permissions</h1>
          <p className="text-muted-foreground">
            Only admins, teachers, and assistants can access this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading your exercises...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Exercises</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the exercises you created</p>
        </div>
        <CreateQuestionForm onSuccess={loadQuestions} />
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Title Filter */}
            <div className="space-y-2">
              <Label htmlFor="title-filter">Filter by title</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="title-filter"
                  placeholder="Enter exercise title..."
                  value={titleFilter}
                  onChange={(e) => setTitleFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Page Size and Clear Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="page-size">Page size</Label>
                <Input
                  id="page-size"
                  type="number"
                  min="1"
                  max="100"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="w-20"
                />
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Your Exercises ({totalCount} total)
            {debouncedTitleFilter.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - Filter
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading exercises...
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedTitleFilter.length > 0
                ? "No exercises match the current filters. Try adjusting your filters."
                : "You haven't created any exercises yet."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-base font-bold">Title</TableHead>
                    <TableHead className="text-base font-bold">
                      Math Difficulty
                    </TableHead>
                    <TableHead className="text-base font-bold">
                      Lean Difficulty
                    </TableHead>
                    <TableHead className="text-base font-bold">Tags</TableHead>
                    <TableHead className="text-right text-base font-bold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{question.title}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getMathDifficultyColor(
                            question.mathDifficulty,
                          )}
                        >
                          {getMathDifficultyDisplayName(
                            question.mathDifficulty,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getLeanDifficultyColor(
                            question.leanDifficulty,
                          )}
                        >
                          {getLeanDifficultyDisplayName(
                            question.leanDifficulty,
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {question.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/dashboard/exercises/${question.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <EditQuestionForm
                            question={question}
                            onSuccess={loadQuestions}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDeleteQuestion(question.id, question.title)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                     {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
