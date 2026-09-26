"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  User,
  ListCourseStudentsRequest,
  EnrollUserInCourseRequest,
  RemoveUserFromCourseRequest,
  ListUsersRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listCourseStudents,
  enrollUserInCourse,
  removeUserFromCourse,
  listUsers,
} from "@/lib/grpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Upload, X, Search, FileText } from "lucide-react";
import { toast } from "sonner";

interface StudentsTabProps {
  courseId: string;
}

interface BatchImportEntry {
  identifier: string;
  displayName?: string;
}

export default function StudentsTab({ courseId }: StudentsTabProps) {
  const { data: session } = useSession();
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search users for individual add
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!session?.user?.token) return;
    try {
      setLoading(true);
      const resp = await listCourseStudents({
        courseId,
        userToken: session.user.token,
        pageSize: 200,
        pageToken: "",
      } as ListCourseStudentsRequest);
      setStudents(resp.students || []);
    } catch (e) {
      console.error("Error loading students:", e);
      toast.error("Failed to load student list");
    } finally {
      setLoading(false);
    }
  }, [courseId, session]);

  useEffect(() => {
    if (session?.user?.token) loadStudents();
  }, [session, loadStudents]);

  // Parse CSV into entries
  const parseCSVText = (text: string): BatchImportEntry[] => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    // Check if first line is a header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = /student\s*(code|id|no)|username|name|email/i.test(firstLine);

    const entries: BatchImportEntry[] = [];
    const startIndex = hasHeader ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c: string) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length >= 1 && cols[0]) {
        entries.push({
          identifier: cols[0],
          displayName: cols.length >= 2 ? cols[1] : undefined,
        });
      }
    }
    return entries;
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  };

  // ---- Batch Import ----
  const handleBatchImport = async () => {
    if (!session?.user?.token) return;

    const entries = parseCSVText(importText);
    if (entries.length === 0) {
      toast.error("Please enter at least one student ID, username, or email");
      return;
    }

    try {
      setImporting(true);
      let success = 0;
      let fail = 0;

      for (const entry of entries) {
        try {
          await enrollUserInCourse({
            courseId,
            userId: entry.identifier,
            userToken: session.user.token,
          } as EnrollUserInCourseRequest);
          success++;
        } catch {
          fail++;
        }
      }

      toast.success(`Imported ${success} student(s)${fail > 0 ? `, ${fail} failed` : ""}`);
      setImportOpen(false);
      setImportText("");
      loadStudents();
    } catch {
      toast.error("Batch import failed");
    } finally {
      setImporting(false);
    }
  };

  // ---- Remove student ----
  const handleRemove = async (userId: string) => {
    if (!session?.user?.token) return;
    try {
      setRemovingId(userId);
      await removeUserFromCourse({
        courseId,
        userId,
        userToken: session.user.token,
      } as RemoveUserFromCourseRequest);
      toast.success("Student removed");
      loadStudents();
    } catch {
      toast.error("Failed to remove student");
    } finally {
      setRemovingId(null);
    }
  };

  // ---- Search users for single add ----
  const handleSearch = async () => {
    if (!session?.user?.token || !searchQuery.trim()) return;
    try {
      setSearching(true);
      const resp = await listUsers({
        pageSize: 20, pageToken: "1", usernameFilter: searchQuery.trim(),
      } as ListUsersRequest);
      setSearchResults(
        (resp.users || []).filter(
          (u) => !students.some((s) => s.id === u.id) && u.role === 4,
        ),
      );
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSingleAdd = async (userId: string) => {
    if (!session?.user?.token) return;
    try {
      await enrollUserInCourse({
        courseId,
        userId,
        userToken: session.user.token,
      } as EnrollUserInCourseRequest);
      toast.success("Student added");
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      loadStudents();
    } catch {
      toast.error("Failed to add student");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Students ({students.length})
          </span>
          <div className="flex gap-2">
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Batch Import
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Single add search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={handleSearch} disabled={searching}>
            <UserPlus className="h-4 w-4 mr-1" />Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-1 border rounded-lg p-3">
            {searchResults.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-1">
                <span className="text-sm">
                  {u.displayName || u.username}
                  {u.studentId ? ` (${u.studentId})` : ""}
                  {u.email ? ` - ${u.email}` : ""}
                </span>
                <Button size="sm" variant="outline" onClick={() => handleSingleAdd(u.id)}>
                  <UserPlus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Student list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
            No students yet. Use batch import or search to add.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.username}</TableCell>
                  <TableCell className="text-sm">{s.studentId || "-"}</TableCell>
                  <TableCell className="text-sm">{s.displayName || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(s.id)}
                      disabled={removingId === s.id}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Batch Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Batch Import Students
            </DialogTitle>
            <DialogDescription>
              Import students by student ID, username, or email. Upload a CSV file or paste data directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* File upload */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Upload CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-xs text-muted-foreground">
                Supports CSV with student IDs, usernames, or emails
              </span>
            </div>

            <Label>Student List</Label>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"student_id_1,Name1\nstudent_id_2,Name2\nstudent_id_3"}
              className="h-40 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Column 1: student ID, username, or email. Column 2: display name (optional).
              Auto-detects header rows with &quot;Student Code&quot;, &quot;Name&quot;, etc.
            </p>
            {importText && (
              <p className="text-sm font-medium">
                {parseCSVText(importText).length} entries detected
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              <X className="h-4 w-4 mr-1" />Cancel
            </Button>
            <Button onClick={handleBatchImport} disabled={importing || !importText.trim()}>
              {importing ? "Importing..." : `Import ${parseCSVText(importText).length} student(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
