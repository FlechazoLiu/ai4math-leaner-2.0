"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listAssignments, deleteAssignment } from "@/lib/grpc";
import {
  ListAssignmentsRequest,
  DeleteAssignmentRequest,
  Assignment,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AssignmentsTabProps {
  courseId: string;
  userToken: string;
}

export default function AssignmentsTab({
  courseId,
  userToken,
}: AssignmentsTabProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [courseId, userToken]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);

    try {
      const request = {
        courseId: courseId,
        userToken: userToken,
        pageSize: 50,
        pageToken: "1",
      } satisfies Partial<ListAssignmentsRequest>;

      const response = await listAssignments(request as ListAssignmentsRequest);
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setError("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (assignment: Assignment) => {
    setDeleteTarget(assignment);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteAssignment({
        assignmentId: deleteTarget.id,
        userToken,
      } as DeleteAssignmentRequest);
      toast.success(`Assignment "${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      fetchAssignments();
    } catch {
      toast.error("Failed to delete assignment");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (isDraft: boolean) => {
    return !isDraft ? (
      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
        Published
      </Badge>
    ) : (
      <Badge
        variant="secondary"
        className="bg-yellow-500 text-white hover:bg-yellow-600"
      >
        Draft
      </Badge>
    );
  };

  return (
    <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-100">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <svg
              className="w-6 h-6 mr-3 text-blue-600"
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
            <span className="text-2xl font-bold text-gray-900">Course Assignments</span>
          </div>
          <Link href={`/dashboard/courses/${courseId}/assignments/create`}>
            <Button className="bg-blue-600 hover:bg-blue-700">
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
              Create Assignment
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <svg
              className="animate-spin h-8 w-8 text-gray-500"
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
            <span className="ml-3 text-gray-600">Loading Assignments...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to Load Assignments
            </h4>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button
              onClick={fetchAssignments}
              variant="outline"
              className="px-4 py-2"
            >
              Retry
            </Button>
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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
              No Assignments
            </h4>
            <p className="text-gray-600 mb-4">
              Create your first Assignment to get started with course content.
            </p>
            <Link href={`/dashboard/courses/${courseId}/assignments/create`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
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
                Create First Assignment
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {assignment.title}
                        </h3>
                        {getStatusBadge(assignment.isDraft)}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {assignment.description || "No Description"}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <svg
                          className="w-4 h-4 mr-1"
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
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Created{" "}
                        {assignment.createdAt
                          ? new Date(assignment.createdAt).toLocaleDateString()
                          : "Unknown Date"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Link
                        href={`/dashboard/courses/${courseId}/assignments/${assignment.id}`}
                      >
                        <Button variant="outline" size="sm" className="w-full">
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </Button>
                      </Link>
                      <Link
                        href={`/dashboard/courses/${courseId}/assignments/${assignment.id}/edit`}
                      >
                        <Button variant="outline" size="sm" className="w-full">
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </Button>
                      </Link>
                      {deleteTarget?.id !== assignment.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-500 border-red-200 hover:bg-red-50"
                          onClick={() => handleDelete(assignment)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
              This will permanently delete the assignment and all student submissions and grades. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deletingId === deleteTarget?.id}
            >
              {deletingId === deleteTarget?.id ? "Deleting..." : "Delete Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
