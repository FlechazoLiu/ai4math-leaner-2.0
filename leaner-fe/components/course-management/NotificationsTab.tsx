"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { listNotifications } from "@/lib/grpc";
import {
  ListNotificationsRequest,
  Notification,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { deleteCourseNotification } from "@/lib/course-actions";

interface NotificationsTabProps {
  courseId: string;
  userToken: string;
}

export default function NotificationsTab({
  courseId,
  userToken,
}: NotificationsTabProps) {
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] =
    useState<Notification | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const successParam = searchParams.get("success");
    if (successParam === "notification-created") {
      setSuccess("Notification sent successfully!");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

      // Refresh notifications list
      fetchNotifications();
    } else if (successParam === "notification-updated") {
      setSuccess("Notification updated successfully!");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);

      // Refresh notifications list
      fetchNotifications();
    }
  }, [searchParams]);

  useEffect(() => {
    fetchNotifications();
  }, [courseId, userToken]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const request = {
        courseId: courseId,
        userToken: userToken,
        pageSize: 50,
        pageToken: "1",
      } satisfies Partial<ListNotificationsRequest>;

      const response = await listNotifications(
        request as ListNotificationsRequest,
      );
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete(notification);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return;

    setDeleteLoading(true);
    try {
      const result = await deleteCourseNotification(notificationToDelete.id);
      if (result.success) {
        setSuccess("Notification deleted successfully!");
        setDeleteDialogOpen(false);
        setNotificationToDelete(null);

        // Refresh notifications list
        fetchNotifications();

        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(result.error || "Failed to delete notification");
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      setError("Failed to delete notification");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setNotificationToDelete(null);
  };

  return (
    <div className="space-y-8">
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-600 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-green-800 font-medium">{success}</p>
          </div>
        </div>
      )}

      <Card className="border-0 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Course Notifications
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Manage and send notifications to all enrolled students
              </p>
            </div>
            <Link
              href={`/dashboard/courses/${courseId}/manage/notifications/create`}
            >
              <Button className="px-6 py-3 text-lg font-semibold bg-purple-600 hover:bg-purple-700">
                <svg
                  className="w-5 h-5 mr-2"
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
                Create Notification
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="px-8 py-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-600 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block w-8 h-8 border-[3px] border-current border-t-transparent text-purple-600 rounded-full mb-4"></div>
              <p className="text-lg text-gray-600">Loading Notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-6">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {notification.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mb-4">
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          By {notification.userName}
                          <svg
                            className="w-4 h-4 ml-4 mr-2"
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
                          {notification.createdAt
                            ? new Date(
                                notification.createdAt,
                              ).toLocaleDateString()
                            : "Unknown Date"}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Link
                          href={`/dashboard/courses/${courseId}/manage/notifications/${notification.id}/edit`}
                        >
                          <Button variant="outline" size="sm">
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteClick(notification)}
                          disabled={deleteLoading}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete
                        </Button>
                      </div>
                    </div>
                    <div className="border-l-4 border-purple-500 pl-6">
                      <Markdown
                        content={notification.message}
                        className="prose max-w-none"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                  />
                </svg>
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">
                No Notifications
              </h4>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                Course notifications will appear here. Create a notification to start communicating with students.
              </p>
              <Link
                href={`/dashboard/courses/${courseId}/manage/notifications/create`}
              >
                <Button variant="outline" className="px-6 py-3 text-lg">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this notification? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {notificationToDelete && (
            <div className="my-4 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-2">
                {notificationToDelete.title}
              </h4>
              <p className="text-sm text-gray-600 line-clamp-3">
                {notificationToDelete.message.length > 100
                  ? notificationToDelete.message.substring(0, 100) + "..."
                  : notificationToDelete.message}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
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
                  Deleting...
                </>
              ) : (
                "Delete Notification"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
