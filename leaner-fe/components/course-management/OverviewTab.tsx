"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import {
  Course,
  AssignTeacherToCourseRequest,
  User as GrpcUser,
  ListCourseStudentsRequest,
  ListUsersRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { getCourseStatistics, deleteCourseAction } from "@/lib/course-actions";
import { assignTeacherToCourse, listCourseStudents, listUsers } from "@/lib/grpc";
import { useSession } from "next-auth/react";
import { Markdown } from "../Markdown";
import { useRouter } from "next/navigation";
import { Search, UserPlus, X } from "lucide-react";

interface OverviewTabProps {
  course: Course;
  onNavigateToTab?: (tabName: string) => void;
  userRole?: number;
}

interface CourseStats {
  totalStudents: number;
  pendingRequests: number;
  totalAssignments: number;
  totalAssistants: number;
}

export default function OverviewTab({
  course,
  onNavigateToTab,
  userRole,
}: OverviewTabProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [stats, setStats] = useState<CourseStats>({
    totalStudents: 0,
    pendingRequests: 0,
    totalAssignments: 0,
    totalAssistants: 0,
  });
  const [loading, setLoading] = useState(true);

  // Add instructor dialog state
  const [instructorDialogOpen, setInstructorDialogOpen] = useState(false);
  const [instructorSearch, setInstructorSearch] = useState("");
  const [instructorResults, setInstructorResults] = useState<GrpcUser[]>([]);
  const [searchingInstructor, setSearchingInstructor] = useState(false);
  const [assigningInstructor, setAssigningInstructor] = useState(false);
  const [instructorError, setInstructorError] = useState<string | null>(null);
  const [instructorSuccess, setInstructorSuccess] = useState<string | null>(null);

  // Delete course dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Add students dialog state
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [students, setStudents] = useState<GrpcUser[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [course.id]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const result = await getCourseStatistics(course.id);
      if (result.success && result.data) {
        setStats(result.data);
      } else {
        console.error("Failed to load course statistics:", result.error);
      }
    } catch (error) {
      console.error("Error loading course statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    if (!session?.user?.token) return;

    try {
      setLoadingStudents(true);
      const request = {
        courseId: course.id,
        userToken: session.user.token,
        pageSize: 100,
        pageToken: "1",
      } as ListCourseStudentsRequest;

      const response = await listCourseStudents(request);
      setStudents(response.students || []);
    } catch (error) {
      console.error("Error loading students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSearchInstructor = async () => {
    if (!session?.user?.token || !instructorSearch.trim()) return;
    try {
	      setSearchingInstructor(true);
	      const request = { pageSize: 20, pageToken: "1" } as ListUsersRequest;
	      request.usernameFilter = instructorSearch.trim();
	      const resp = await listUsers(request);
      // Only show users with admin or teacher role
      setInstructorResults(
        (resp.users || []).filter((u) => [1, 2].includes(u.role)),
      );
    } catch {
      setInstructorError("Search failed");
    } finally {
      setSearchingInstructor(false);
    }
  };

  const handleAssignInstructor = async (userId: string) => {
    if (!session?.user?.token) return;

    setAssigningInstructor(true);
    setInstructorError(null);

    try {
      const request = {
        courseId: course.id,
        userId: userId,
        userToken: session.user.token,
      } satisfies Partial<AssignTeacherToCourseRequest>;

      await assignTeacherToCourse(request as AssignTeacherToCourseRequest);

      setInstructorSuccess("Instructor assigned successfully!");
      setInstructorDialogOpen(false);
      setInstructorSearch("");
      setInstructorResults([]);

      await loadStatistics();
      setTimeout(() => setInstructorSuccess(null), 3000);
    } catch (error) {
      console.error("Error assigning instructor:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Failed to assign instructor";
      setInstructorError(errorMsg);
    } finally {
      setAssigningInstructor(false);
    }
  };

  const handleCloseInstructorDialog = () => {
    setInstructorDialogOpen(false);
    setInstructorSearch("");
    setInstructorResults([]);
    setInstructorError(null);
  };

  const handleDeleteCourse = async () => {
    setDeleting(true);
    setDeleteError(null);

    try {
      await deleteCourseAction(course.id);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error deleting course:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete course",
      );
      setDeleting(false);
    }
  };
  return (
    <div className="space-y-4">
      {/* Success/Error Messages */}
      {instructorSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800 text-sm">{instructorSuccess}</p>
        </div>
      )}

      {instructorError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{instructorError}</p>
        </div>
      )}

      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{deleteError}</p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Course Statistics</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadStatistics}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => {
            setStudentsDialogOpen(true);
            loadStudents();
          }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalStudents}
            </div>
            <p className="text-xs text-gray-600">Enrolled Students</p>
            <p className="text-xs text-blue-600 mt-1">Click to view students</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab && onNavigateToTab("students")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.pendingRequests}
            </div>
            <p className="text-xs text-gray-600">Enrollment Requests</p>
            {stats.pendingRequests > 0 && (
              <p className="text-xs text-blue-600 mt-1">Click to see requests</p>
            )}
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab && onNavigateToTab("assignments")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalAssignments}
            </div>
            <p className="text-xs text-gray-600">Total Assignments</p>
            <p className="text-xs text-blue-600 mt-1">Click to manage assignments</p>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onNavigateToTab && onNavigateToTab("assistants")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assistant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : stats.totalAssistants}
            </div>
            <p className="text-xs text-gray-600">Assigned Assistants</p>
            <p className="text-xs text-blue-600 mt-1">Click to manage assistants</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Course Title
              </Label>
              <p className="mt-1 text-sm text-gray-900">{course.title}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">
                Created
              </Label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(course.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <Markdown content={course.description} />
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-gray-700">
                  Teacher
                </Label>
                <Dialog
                  open={instructorDialogOpen}
                  onOpenChange={setInstructorDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
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
                      Add Teacher
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Teacher</DialogTitle>
                      <DialogDescription>
                        Search for a user with Admin or Teacher role to assign as instructor.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={instructorSearch}
                            onChange={(e) => setInstructorSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearchInstructor()}
                            placeholder="Search by username, name, or email..."
                            className="pl-10"
                          />
                        </div>
                        <Button variant="outline" onClick={handleSearchInstructor} disabled={searchingInstructor}>
                          Search
                        </Button>
                      </div>
                      {instructorError && (
                        <p className="text-sm text-red-600">{instructorError}</p>
                      )}
                      {instructorResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                          {instructorResults.map((u) => (
                            <div key={u.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                              <div>
                                <p className="text-sm font-medium">{u.displayName || u.username}</p>
                                <p className="text-xs text-muted-foreground">
                                  {u.email || ""} {u.studentId ? `(${u.studentId})` : ""}
                                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-100">
                                    {u.role === 1 ? "Admin" : "Teacher"}
                                  </span>
                                </p>
                              </div>
                              <Button size="sm" onClick={() => handleAssignInstructor(u.id)} disabled={assigningInstructor}>
                                <UserPlus className="h-3 w-3 mr-1" />Assign
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {instructorSearch && !searchingInstructor && instructorResults.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No admin or teacher users found.
                        </p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseInstructorDialog}>
                        <X className="h-4 w-4 mr-1" />Close
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {course.instructorNames && course.instructorNames.length > 0 ? (
                  course.instructorNames.map((name: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No instructors</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Dialog */}
      <Dialog open={studentsDialogOpen} onOpenChange={setStudentsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Enrolled Students</DialogTitle>
            <DialogDescription>
              List of enrolled students ({students.length} students enrolled)
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {loadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading Students...</p>
                </div>
              </div>
            ) : students.length === 0 ? (
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  No students
                </h4>
                <p className="text-gray-600">No students have enrolled in this course.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">
                        {student.username?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.username}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {student.email}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Student
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStudentsDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Danger Zone - Only for Admins */}
      {userRole === 1 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-red-800 mb-2">
                  Delete Course
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Permanently delete this course and all its data. This action cannot be undone.
                </p>
                <Dialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete Course"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Course</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete &quot;{course.title}&quot;
                        ? This action cannot be undone.
                        This will permanently delete all course data, including enrollments, assignments, and posts.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteCourse}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting..." : "Delete Course"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
