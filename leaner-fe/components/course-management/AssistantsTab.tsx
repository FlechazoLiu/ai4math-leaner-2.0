"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { assignAssistant } from "@/lib/course-actions";
import { listCourseAssistants, removeAssistantFromCourse, listUsers } from "@/lib/grpc";
import {
  ListCourseAssistantsRequest,
  RemoveAssistantFromCourseRequest,
  ListUsersRequest,
  User,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { useSession } from "next-auth/react";
import { Search, UserPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface AssistantsTabProps {
  courseId: string;
}

export default function AssistantsTab({ courseId }: AssistantsTabProps) {
  const { data: session } = useSession();
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Assistants list
  const [assistants, setAssistants] = useState<User[]>([]);
  const [assistantsLoading, setAssistantsLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAssistants = useCallback(async () => {
    if (!session?.user?.token) return;
    try {
      setAssistantsLoading(true);
      const response = await listCourseAssistants({
        courseId,
        userToken: session.user.token,
        pageSize: 50,
        pageToken: "1",
      } as ListCourseAssistantsRequest);
      setAssistants(response.assistants || []);
    } catch (e) {
      console.error("Error fetching assistants:", e);
    } finally {
      setAssistantsLoading(false);
    }
  }, [courseId, session]);

  useEffect(() => {
    if (session?.user?.token) fetchAssistants();
  }, [session, fetchAssistants]);

  // Search users to add as assistant
  const handleSearch = async () => {
    if (!session?.user?.token || !searchQuery.trim()) return;
    try {
      setSearching(true);
      const resp = await listUsers({
        pageSize: 20,
        pageToken: "",
        usernameFilter: searchQuery.trim(),
      } as ListUsersRequest);
      setSearchResults(
        (resp.users || []).filter(
          (u) => !assistants.some((a) => a.id === u.id) && u.role !== 4,
        ),
      );
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleAssign = async (userId: string) => {
    if (!session?.user?.token) return;
    try {
      setAssigning(true);
      const result = await assignAssistant(courseId, userId);
      if (result.success) {
        toast.success("Assistant assigned successfully");
        setSearchResults((prev) => prev.filter((u) => u.id !== userId));
        fetchAssistants();
      } else {
        toast.error(result.error || "Failed to assign assistant");
      }
    } catch {
      toast.error("Failed to assign assistant");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!session?.user?.token) return;
    try {
      setRemovingId(userId);
      await removeAssistantFromCourse({
        courseId,
        userId,
        userToken: session.user.token,
      } as RemoveAssistantFromCourseRequest);
      toast.success("Assistant removed");
      fetchAssistants();
    } catch {
      toast.error("Failed to remove assistant");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Course Assistants ({assistants.length})</CardTitle>
        <Dialog open={assistantDialogOpen} onOpenChange={setAssistantDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Assistant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Course Assistant</DialogTitle>
              <DialogDescription>
                Search for a user to assign as an assistant for this course.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search by username, name, or email..."
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={handleSearch} disabled={searching}>
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                  {searchResults.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">{u.displayName || u.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email || ""} {u.studentId ? `(${u.studentId})` : ""}
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100">
                            {u.role === 1 ? "Admin" : u.role === 2 ? "Teacher" : u.role === 3 ? "Assistant" : ""}
                          </span>
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleAssign(u.id)} disabled={assigning}>
                        <UserPlus className="h-3 w-3 mr-1" />Assign
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found matching your search.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAssistantDialogOpen(false); setSearchQuery(""); setSearchResults([]); }}>
                <X className="h-4 w-4 mr-1" />Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {assistantsLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : assistants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No assistants assigned yet.
          </div>
        ) : (
          <div className="space-y-2">
            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    {(assistant.displayName || assistant.username)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{assistant.displayName || assistant.username}</p>
                    <p className="text-xs text-muted-foreground">{assistant.email || assistant.studentId || ""}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(assistant.id)}
                  disabled={removingId === assistant.id}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
