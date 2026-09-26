"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { create } from "@bufbuild/protobuf";
import {
  User,
  ListUsersRequestSchema,
  UpdateUserRoleRequestSchema,
  ResetUserPasswordRequestSchema,
  Role,
  CreateUserRequestSchema,
  BatchCreateUsersRequestSchema,
  BatchCreateUserEntry,
  DeleteUserRequestSchema,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listUsers, updateUserRole, resetUserPassword, createUser, batchCreateUsers, deleteUser } from "@/lib/grpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RotateCcw, UserPlus, Upload, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and pagination state
  const [usernameFilter, setUsernameFilter] = useState("");
  const [debouncedUsernameFilter, setDebouncedUsernameFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Create user dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>(Role.STUDENT);
  const [creating, setCreating] = useState(false);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Batch import dialog state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importRole, setImportRole] = useState<Role>(Role.STUDENT);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce username filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsernameFilter(usernameFilter);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameFilter]);

  // Check if user is admin
  const isAdmin = session?.user?.role === 1;

  useEffect(() => {
    loadUsers();
  }, [debouncedUsernameFilter, pageSize, currentPage, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      // When role filter is active, fetch all users (pageToken="0") so client-side
      // filtering works on the complete dataset, not just one page.
      const fetchAll = roleFilter !== "all" && !debouncedUsernameFilter.trim();
      const request = create(ListUsersRequestSchema, {
        pageSize: fetchAll ? 0 : pageSize,
        pageToken: fetchAll ? "0" : currentPage.toString(),
      });

      if (debouncedUsernameFilter.trim()) {
        request.usernameFilter = debouncedUsernameFilter.trim();
      }

      const response = await listUsers(request);
      setUsers(response.users);
      setTotalCount(response.totalCount);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: Role) => {
    if (!isAdmin) {
      toast.error("Permission denied. Only admin can update user roles.");
      return;
    }

    try {
      const request = create(UpdateUserRoleRequestSchema, { userId, role: newRole });
      await updateUserRole(request);
      toast.success("User role updated successfully");
      loadUsers();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleResetPassword = async (userId: string, username: string) => {
    if (!isAdmin) {
      toast.error("Permission denied. Only admin can reset passwords.");
      return;
    }

    if (!confirm(`Are you sure you want to reset the password for user "${username}"?`)) {
      return;
    }

    try {
      const request = create(ResetUserPasswordRequestSchema, { userId });
      await resetUserPassword(request);
      toast.success("Password reset successfully");
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    if (!isAdmin || !session?.user?.token) return;
    if (!confirm(`Are you sure you want to permanently delete user "${displayName}"? This cannot be undone.`)) return;

    try {
      await deleteUser(create(DeleteUserRequestSchema, { userId, adminToken: session.user.token }));
      toast.success(`User "${displayName}" deleted`);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    }
  };

  // ---- Batch Selection ----
  const toggleSelectUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!isAdmin || !session?.user?.token || selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.size} user(s)? This cannot be undone.`)) return;
    setBulkActionLoading(true);
    let success = 0, fail = 0;
    for (const userId of selectedIds) {
      try {
        await deleteUser(create(DeleteUserRequestSchema, { userId, adminToken: session.user.token }));
        success++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setBulkActionLoading(false);
    toast.success(`Deleted ${success} user(s)${fail > 0 ? `, ${fail} failed` : ""}`);
    loadUsers();
  };

  const handleBatchRoleChange = async (newRole: Role) => {
    if (!isAdmin || !session?.user?.token || selectedIds.size === 0) return;
    if (!confirm(`Change role of ${selectedIds.size} user(s) to ${Role[newRole].replace("ROLE_", "")}?`)) return;
    setBulkActionLoading(true);
    let success = 0, fail = 0;
    for (const userId of selectedIds) {
      try {
        await updateUserRole(create(UpdateUserRoleRequestSchema, { userId, role: newRole }));
        success++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setBulkActionLoading(false);
    toast.success(`Updated ${success} user(s)${fail > 0 ? `, ${fail} failed` : ""}`);
    loadUsers();
  };

  const handleBatchResetPassword = async () => {
    if (!isAdmin || !session?.user?.token || selectedIds.size === 0) return;
    if (!confirm(`Reset password for ${selectedIds.size} user(s)?`)) return;
    setBulkActionLoading(true);
    let success = 0, fail = 0;
    for (const userId of selectedIds) {
      try {
        await resetUserPassword(create(ResetUserPasswordRequestSchema, { userId }));
        success++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setBulkActionLoading(false);
    toast.success(`Reset password for ${success} user(s)${fail > 0 ? `, ${fail} failed` : ""}`);
    loadUsers();
  };

  // ---- Create User ----
  const handleCreateUser = async () => {
    if (!isAdmin || !session?.user?.token) return;
    const roleName = Role[newRole].replace("ROLE_", "");
    const isStudent = roleName === "STUDENT";

    if (!newDisplayName.trim()) {
      toast.error("Display Name is required");
      return;
    }
    if (isStudent && !newStudentId.trim()) {
      toast.error("Student ID is required for student role");
      return;
    }
    if (!isStudent && !newEmail.trim()) {
      toast.error("Email is required for non-student users");
      return;
    }

    try {
      setCreating(true);
      await createUser(create(CreateUserRequestSchema, {
        studentId: newStudentId.trim() || undefined,
        displayName: newDisplayName.trim(),
        email: newEmail.trim() || undefined,
        role: newRole,
        adminToken: session.user.token,
      }));

      toast.success(`User ${newStudentId} created successfully`);
      setCreateOpen(false);
      setNewStudentId("");
      setNewDisplayName("");
      setNewEmail("");
      setNewRole(Role.STUDENT);
      loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // ---- Batch Import ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      // Auto-detect if it has the Student List CSV format (with Student Code,Name,University,Email...)
      const lines = text.split("\n");
      const headerLine = lines.find(l => l.includes("Student Code") || l.includes("student_id"));
      if (headerLine) {
        // Find column indices by header names
        const headers = headerLine.split(",").map(h => h.trim());
        const codeIdx = headers.findIndex(h => h.includes("Student Code") || h === "student_id");
        const nameIdx = headers.findIndex(h => h === "Name" || h === "display_name");
        const emailIdx = headers.findIndex(h => h === "Email" || h === "email");
        if (codeIdx >= 0 && nameIdx >= 0) {
          const dataStart = lines.indexOf(headerLine) + 1;
          const converted = lines.slice(dataStart)
            .filter(l => l.trim())
            .map(l => {
              const cols = l.split(",").map(c => c.trim());
              const sid = cols[codeIdx]?.replace(/^["']|["']$/g, "");
              const name = cols[nameIdx]?.replace(/^["']|["']$/g, "");
              const email = emailIdx >= 0 ? cols[emailIdx]?.replace(/^["']|["']$/g, "") : "";
              return `${sid},${name}${email ? `,${email}` : ""}`;
            })
            .filter(l => l.split(",")[0]?.match(/^\d+$/))
            .join("\n");
          setImportText(converted);
          return;
        }
      }
      // Plain format: just set as-is
      setImportText(text);
    };
    reader.readAsText(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const parseCSVText = (text: string): BatchCreateUserEntry[] => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const entries: BatchCreateUserEntry[] = [];

    for (const line of lines) {
      const cols = line.split(",").map(c => c.trim());
      if (cols.length >= 2) {
        const studentId = cols[0].replace(/^["']|["']$/g, "");
        const name = cols[1].replace(/^["']|["']$/g, "");
        const email = cols.length >= 3 ? cols[2].replace(/^["']|["']$/g, "") : "";
        if (studentId && name) {
          entries.push({
            studentId,
            displayName: name,
            email: email || undefined,
          } as BatchCreateUserEntry);
        }
      }
    }
    return entries;
  };

  const handleBatchImport = async () => {
    if (!isAdmin || !session?.user?.token) return;

    const entries = parseCSVText(importText);
    if (entries.length === 0) {
      toast.error("No valid entries found. Format: student_id, display_name[, email]");
      return;
    }

    try {
      setImporting(true);
      setImportResults(null);
      const resp = await batchCreateUsers(create(BatchCreateUsersRequestSchema, {
        users: entries,
        role: importRole,
        adminToken: session.user.token,
      }));

      const success = resp.successCount || 0;
      const fail = resp.failCount || 0;
      const resultMsg = `Imported ${success} user(s) successfully${fail > 0 ? `, ${fail} failed` : ""}`;
      toast.success(resultMsg);

      const errors = resp.results?.filter(r => !r.success).map(r => `${r.studentId}: ${r.errorMessage}`).join("\n");
      setImportResults(errors ? `${resultMsg}\nErrors:\n${errors}` : resultMsg);

      if (success > 0) {
        setImportOpen(false);
        setImportText("");
        loadUsers();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Batch import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleUsernameFilterChange = (value: string) => {
    setUsernameFilter(value);
  };

  const handlePageSizeChange = (value: string) => {
    const newPageSize = parseInt(value);
    if (newPageSize > 0 && newPageSize <= 100) {
      setPageSize(newPageSize);
      setCurrentPage(1);
    }
  };

  const getRoleDisplayName = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return "Admin";
      case Role.TEACHER: return "Teacher";
      case Role.ASSISTANT: return "Assistant";
      case Role.STUDENT: return "Student";
      default: return "Unknown";
    }
  };

  const getRoleFromString = (roleString: string): Role => {
    switch (roleString) {
      case "ADMIN": return Role.ADMIN;
      case "TEACHER": return Role.TEACHER;
      case "ASSISTANT": return Role.ASSISTANT;
      case "STUDENT": return Role.STUDENT;
      default: return Role.UNSPECIFIED;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Apply role filter on frontend
  const ROLE_FILTER_MAP: Record<number, string> = {
    [Role.UNSPECIFIED]: "all",
    [Role.ADMIN]: "ADMIN",
    [Role.TEACHER]: "TEACHER",
    [Role.ASSISTANT]: "ASSISTANT",
    [Role.STUDENT]: "STUDENT",
  };
  const filteredUsers = roleFilter === "all"
    ? users
    : users.filter(u => ROLE_FILTER_MAP[u.role] === roleFilter);

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          {isAdmin && (
            <p className="text-sm text-muted-foreground mt-1">
              Create, import, and manage user accounts. Students log in with their Student ID.
            </p>
          )}
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />Batch Import
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />Create User
            </Button>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new user account. Every user must have at least a Student ID or an Email. The initial password will be the Student ID (for students) or a default password (for teachers/staff).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {newRole === Role.STUDENT && (
            <div className="space-y-2">
              <Label>Student ID *</Label>
              <Input value={newStudentId} onChange={e => setNewStudentId(e.target.value)} placeholder="e.g. 2024000001" />
            </div>
            )}
            <div className="space-y-2">
              <Label>Display Name *</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="e.g. Alice Chen" />
            </div>
            <div className="space-y-2">
              <Label>Email {newRole !== Role.STUDENT ? "*" : "(optional)"}</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="e.g. user@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={Role[newRole].replace("ROLE_", "")} onValueChange={v => setNewRole(getRoleFromString(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="ASSISTANT">Assistant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={creating || (newRole === Role.STUDENT && !newStudentId) || !newDisplayName}>
              {creating ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />Batch Import Users
            </DialogTitle>
            <DialogDescription>
              Paste CSV data (student_id, display_name, email) or upload a file. One per line.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role to assign</Label>
              <Select value={Role[importRole].replace("ROLE_", "")} onValueChange={v => setImportRole(getRoleFromString(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="ASSISTANT">Assistant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Student data (CSV format)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5 mr-1" />Upload CSV
                </Button>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </div>
              <Textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={`2024000001, Alice Chen, alice@example.com\n2024000002, Bob Li, bob@example.com`}
                className="h-36 font-mono text-sm"
              />
            </div>
            {importResults && (
              <pre className="text-xs bg-gray-50 p-3 rounded border whitespace-pre-wrap max-h-32 overflow-y-auto">
                {importResults}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              <X className="h-4 w-4 mr-1" />Close
            </Button>
            <Button onClick={handleBatchImport} disabled={importing || !importText.trim()}>
              {importing ? "Importing..." : `Import ${parseCSVText(importText).length} user(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />Filters & Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="username-filter">Search by username, name, email, or student ID</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username-filter"
                  placeholder="Type to search..."
                  value={usernameFilter}
                  onChange={(e) => handleUsernameFilterChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="ASSISTANT">Assistant</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <Button variant="outline" onClick={() => { setUsernameFilter(""); setDebouncedUsernameFilter(""); setRoleFilter("all"); setPageSize(10); setCurrentPage(1); }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} user(s) selected</span>
          <div className="flex gap-2 ml-auto">
            <Select onValueChange={(v) => handleBatchRoleChange(getRoleFromString(v))} disabled={bulkActionLoading}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Change role to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="TEACHER">Teacher</SelectItem>
                <SelectItem value="ASSISTANT">Assistant</SelectItem>
                <SelectItem value="STUDENT">Student</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleBatchResetPassword} disabled={bulkActionLoading}>
              <RotateCcw className="h-4 w-4 mr-1" />Reset Password
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBatchDelete} disabled={bulkActionLoading}>
              <Trash2 className="h-4 w-4 mr-1" />Delete {bulkActionLoading ? "..." : `(${selectedIds.size})`}
            </Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Users ({totalCount} total{roleFilter !== "all" ? `, ${filteredUsers.length} shown` : ""})
            {debouncedUsernameFilter && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - filtered by &quot;{debouncedUsernameFilter}&quot;
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedUsernameFilter
                ? `No users matching "${debouncedUsernameFilter}"${roleFilter !== "all" ? ` with role ${roleFilter}` : ""}.`
                : "No users found."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-10">
                        <input type="checkbox" className="h-4 w-4 cursor-pointer"
                          checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                          onChange={toggleSelectAll} />
                      </TableHead>
                    )}
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>ID</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} className={selectedIds.has(user.id) ? "bg-muted/50" : ""}>
                      {isAdmin && (
                        <TableCell className="w-10">
                          <input type="checkbox" className="h-4 w-4 cursor-pointer"
                            checked={selectedIds.has(user.id)}
                            onChange={() => toggleSelectUser(user.id)} />
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm">{user.studentId || "-"}</TableCell>
                      <TableCell className="font-medium">{user.displayName || user.username}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <Select
                            value={Role[user.role].replace("ROLE_", "")}
                            onValueChange={(value) => handleRoleChange(user.id, getRoleFromString(value))}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                              <SelectItem value="TEACHER">Teacher</SelectItem>
                              <SelectItem value="ASSISTANT">Assistant</SelectItem>
                              <SelectItem value="STUDENT">Student</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{getRoleDisplayName(user.role)}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {user.id.substring(0, 8)}...
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleResetPassword(user.id, user.username)}>
                              <RotateCcw className="h-4 w-4 mr-1" />Reset
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user.id, user.displayName || user.username)}>
                              <Trash2 className="h-4 w-4 mr-1" />Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
                      Previous
                    </Button>
                    <span className="text-sm">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>
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
