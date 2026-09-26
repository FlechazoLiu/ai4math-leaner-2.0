"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  ListAnswersRequest,
  ListAssignmentAnswersRequest,
  AnswerVerificationStatus,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listAnswers, listAssignmentAnswers } from "@/lib/grpc";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, FileText, Search, BookOpen, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

// Unified answer row type
interface UnifiedAnswer {
  id: string;
  type: "exercise" | "assignment";
  title: string;
  isDraft: boolean;
  verificationStatus: AnswerVerificationStatus;
  score: number | null;
  feedback: string | null;
  linkTo: string;
  createdAt: string;
}

export default function MyAnswersPage() {
  const { data: session } = useSession();

  const [tab, setTab] = useState<"all" | "exercise" | "assignment">("all");
  const [allItems, setAllItems] = useState<UnifiedAnswer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Pagination
  const [displayCount, setDisplayCount] = useState(20);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (session?.user?.token) loadAll();
  }, [session]);

  const loadAll = useCallback(async () => {
    if (!session?.user?.token) return;
    try {
      setLoading(true);

      // Fetch exercise answers
      const exResp = await listAnswers({
        pageSize: 100,
        pageToken: "",
        userToken: session.user.token,
        userName: session.user.name,
        excludeDrafts: false,
      } as ListAnswersRequest);

      // Fetch assignment answers
      let asResp;
      try {
        asResp = await listAssignmentAnswers({
          pageSize: 100,
          pageToken: "",
          userToken: session.user.token,
        } as ListAssignmentAnswersRequest);
      } catch {
        asResp = { answers: [], totalCount: 0 };
      }

      // Merge into unified list
      const unified: UnifiedAnswer[] = [
        ...exResp.answers.map((a) => ({
          id: a.id,
          type: "exercise" as const,
          title: a.questionTitle,
          isDraft: a.isDraft,
          verificationStatus: a.verificationStatus,
          score: a.grading?.score ?? null,
          feedback: a.grading?.feedbackText ?? null,
          linkTo: `/dashboard/answers/${a.id}`,
          createdAt: "", // Answer proto doesn't have createdAt
        })),
        ...(asResp.answers || []).map((a) => ({
          id: a.id,
          type: "assignment" as const,
          title: a.assignmentQuestionId,
          isDraft: a.isDraft,
          verificationStatus: a.verificationStatus,
          score: a.grades?.length ? a.grades[a.grades.length - 1].grade : null,
          feedback: null,
          linkTo: `/dashboard/review/${a.id}/grade?type=assignment`,
          createdAt: a.createdAt || "",
        })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

      setAllItems(unified);
    } catch (e) {
      console.error("Error loading answers:", e);
      toast.error("Failed to load answers");
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Filter + paginate
  const filtered = allItems.filter((item) => {
    if (tab !== "all" && item.type !== tab) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return item.title.toLowerCase().includes(q);
    }
    return true;
  });
  const displayed = filtered.slice(0, displayCount);

  // Verifier badge
  const verifBadge = (status: AnswerVerificationStatus) => {
    switch (status) {
      case AnswerVerificationStatus.SUCCESSFUL:
        return <Badge className="bg-green-100 text-green-700 border-green-300">Verified</Badge>;
      case AnswerVerificationStatus.FAILED:
        return <Badge className="bg-red-100 text-red-700 border-red-300">Failed</Badge>;
      case AnswerVerificationStatus.PENDING:
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Loader2 className="h-3 w-3 mr-1 animate-spin inline" />
            Pending
          </Badge>
        );
      case AnswerVerificationStatus.NOT_APPLICABLE:
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Not Verified</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Answers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all submissions for exercises and assignments
        </p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setDisplayCount(20); }}>
          <TabsList>
            <TabsTrigger value="all">All ({allItems.length})</TabsTrigger>
            <TabsTrigger value="exercise">
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />
              Exercises ({allItems.filter((i) => i.type === "exercise").length})
            </TabsTrigger>
            <TabsTrigger value="assignment">
              <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
              Assignments ({allItems.filter((i) => i.type === "assignment").length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {tab === "all" ? "All Submissions" : tab === "exercise" ? "Exercise Submissions" : "Assignment Submissions"}
            {" "}({filtered.length} )
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {debouncedSearch ? "No matching answers" : tab !== "all" ? "No submissions of this type" : "No submissions yet"}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Verification</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`}>
                      <TableCell>
                        {item.type === "exercise" ? (
                          <Badge variant="outline" className="text-xs">
                            <BookOpen className="h-3 w-3 mr-1" />Exercises
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                            <ClipboardCheck className="h-3 w-3 mr-1" />Assignments
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-56 truncate">
                        {item.title}
                      </TableCell>
                      <TableCell>{verifBadge(item.verificationStatus)}</TableCell>
                      <TableCell>
                        {item.score !== null ? (
                          <Badge
                            variant="outline"
                            className={
                              item.score >= 80
                                ? "bg-green-100 text-green-700 border-green-300"
                                : item.score >= 60
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                  : "bg-red-100 text-red-700 border-red-300"
                            }
                          >
                            {item.score}/100
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={item.linkTo}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {displayed.length < filtered.length && (
                <div className="text-center mt-4">
                  <Button variant="outline" onClick={() => setDisplayCount((c) => c + 20)}>
                    Load More ( {filtered.length - displayed.length} )
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
