"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Question,
  ListQuestionsRequest,
  DeleteQuestionRequest,
  MathDifficulty,
  LeanDifficulty,
  Tag,
  ListTagsRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listQuestions, deleteQuestion, listTags } from "@/lib/grpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Filter, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import CreateQuestionForm from "@/components/CreateQuestionForm";
import Link from "next/link";

export default function ExercisesPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and pagination state - initialized from URL
  const [pageSize, setPageSize] = useState(() =>
    parseInt(searchParams.get("pageSize") || "10"),
  );
  const [currentPage, setCurrentPage] = useState(() =>
    parseInt(searchParams.get("page") || "1"),
  );
  const [totalCount, setTotalCount] = useState(0);

  // Filter state - initialized from URL
  const [selectedTagName, setSelectedTagName] = useState(
    () => searchParams.get("tag") || "",
  );
  const [mathDifficultyFilter, setMathDifficultyFilter] = useState<
    MathDifficulty | undefined
  >(() => {
    const mathDiff = searchParams.get("mathDifficulty");
    return mathDiff ? (parseInt(mathDiff) as MathDifficulty) : undefined;
  });
  const [leanDifficultyFilter, setLeanDifficultyFilter] = useState<
    LeanDifficulty | undefined
  >(() => {
    const leanDiff = searchParams.get("leanDifficulty");
    return leanDiff ? (parseInt(leanDiff) as LeanDifficulty) : undefined;
  });
  const [titleFilter, setTitleFilter] = useState(
    () => searchParams.get("title") || "",
  );
  const [debouncedTitleFilter, setDebouncedTitleFilter] = useState(
    () => searchParams.get("title") || "",
  );

  // Available tags for filtering
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  // Check if user can modify questions (admin, teacher, assistant)
  const canModifyQuestions =
    session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Update URL when filters change
  const updateURL = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Debounce title filter and update URL
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTitleFilter(titleFilter);
      updateURL({ title: titleFilter, page: 1 });
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [titleFilter]);

  useEffect(() => {
    loadQuestions();
  }, [
    selectedTagName,
    mathDifficultyFilter,
    leanDifficultyFilter,
    debouncedTitleFilter,
    pageSize,
    currentPage,
  ]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const request = {
        pageSize,
        pageToken: currentPage.toString(),
        tagName: selectedTagName,
      } as ListQuestionsRequest;

      // Add difficulty filters if specified
      if (mathDifficultyFilter !== undefined) {
        request.mathDifficulty = mathDifficultyFilter;
      }
      if (leanDifficultyFilter !== undefined) {
        request.leanDifficulty = leanDifficultyFilter;
      }

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

  const loadTags = async () => {
    try {
      const request = {
        pageSize: 100, // Get all tags for filtering
        pageToken: "1",
      } as ListTagsRequest;

      const response = await listTags(request);
      setAvailableTags(response.tags);
    } catch (error) {
      console.error("Error loading tags:", error);
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
      toast.error("Insufficient permissions. Only admins, teachers, and assistants can delete questions.");
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

  const handleTagFilterChange = (tagName: string) => {
    const newTagName = selectedTagName === tagName ? "" : tagName;
    setSelectedTagName(newTagName);
    setCurrentPage(1);
    updateURL({ tag: newTagName, page: 1 });
  };

  const handleMathDifficultyChange = (value: string) => {
    const newDifficulty =
      value === "" ? undefined : (parseInt(value) as MathDifficulty);
    setMathDifficultyFilter(newDifficulty);
    setCurrentPage(1);
    updateURL({ mathDifficulty: newDifficulty, page: 1 });
  };

  const handleLeanDifficultyChange = (value: string) => {
    const newDifficulty =
      value === "" ? undefined : (parseInt(value) as LeanDifficulty);
    setLeanDifficultyFilter(newDifficulty);
    setCurrentPage(1);
    updateURL({ leanDifficulty: newDifficulty, page: 1 });
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (newPageSize > 0 && newPageSize <= 100) {
      setPageSize(newPageSize);
      setCurrentPage(1);
      updateURL({ pageSize: newPageSize, page: 1 });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    updateURL({ page: newPage });
  };

  const clearFilters = () => {
    setSelectedTagName("");
    setMathDifficultyFilter(undefined);
    setLeanDifficultyFilter(undefined);
    setTitleFilter("");
    setDebouncedTitleFilter("");
    setPageSize(10);
    setCurrentPage(1);
    router.replace("/dashboard/exercises", { scroll: false });
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

  if (loading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading exercises...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Exercises</h1>
          {!canModifyQuestions && (
            <p className="text-sm text-muted-foreground mt-1">
              You can view all exercises. Only admins, teachers, and assistants can create or delete exercises.
            </p>
          )}
        </div>
        {canModifyQuestions && <CreateQuestionForm onSuccess={loadQuestions} />}
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters & Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Difficulty Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Math Difficulty</Label>
                <Select
                  value={mathDifficultyFilter?.toString() || ""}
                  onValueChange={handleMathDifficultyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Math Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MathDifficulty.SIMP.toString()}>
                      Simp
                    </SelectItem>
                    <SelectItem value={MathDifficulty.EASY.toString()}>
                      Easy
                    </SelectItem>
                    <SelectItem value={MathDifficulty.MEDIUM.toString()}>
                      Medium
                    </SelectItem>
                    <SelectItem value={MathDifficulty.HARD.toString()}>
                      Hard
                    </SelectItem>
                    <SelectItem value={MathDifficulty.SORRY.toString()}>
                      Sorry
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lean Difficulty</Label>
                <Select
                  value={leanDifficultyFilter?.toString() || ""}
                  onValueChange={handleLeanDifficultyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Lean Difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LeanDifficulty.SIMP.toString()}>
                      Simp
                    </SelectItem>
                    <SelectItem value={LeanDifficulty.EASY.toString()}>
                      Easy
                    </SelectItem>
                    <SelectItem value={LeanDifficulty.MEDIUM.toString()}>
                      Medium
                    </SelectItem>
                    <SelectItem value={LeanDifficulty.HARD.toString()}>
                      Hard
                    </SelectItem>
                    <SelectItem value={LeanDifficulty.SORRY.toString()}>
                      Sorry
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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

            {/* Tag Filters */}
            <div className="space-y-2">
              <Label>Filter by tag</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={
                      selectedTagName === tag.name ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => handleTagFilterChange(tag.name)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              {selectedTagName.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Showing questions with tag: {selectedTagName}
                </p>
              )}
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
            Exercises ({totalCount} total)
            {(selectedTagName.length > 0 ||
              mathDifficultyFilter !== undefined ||
              leanDifficultyFilter !== undefined ||
              debouncedTitleFilter.length > 0) && (
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
              {selectedTagName.length > 0 ||
              mathDifficultyFilter !== undefined ||
              leanDifficultyFilter !== undefined ||
              debouncedTitleFilter.length > 0
                ? "No exercises match the current filters. Try adjusting your filters."
                : "No exercises found."}
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
                          {canModifyQuestions && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDeleteQuestion(
                                  question.id,
                                  question.title,
                                )
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
                    Showing {(currentPage - 1) * pageSize + 1} to{" "}
                    {Math.min(currentPage * pageSize, totalCount)} of{" "}
                    {totalCount} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                       {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePageChange(Math.min(totalPages, currentPage + 1))
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
