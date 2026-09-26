"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import Link from "next/link";
import { listNotifications, listAssignments } from "@/lib/grpc";
import {
  ListNotificationsRequest,
  Notification,
  ListAssignmentsRequest,
  Assignment,
} from "@/lib/gen/leaner/v1/leaner_pb";
import CreatePostForm from "@/components/CreatePostForm";
import PostList from "@/components/PostList";

interface EnrolledCourseContentProps {
  courseId: string;
  userToken: string;
  userRole: string;
}

export default function EnrolledCourseContent({
  courseId,
  userToken,
  userRole,
}: EnrolledCourseContentProps) {
  const isTeacherOrAdmin = userRole === "1" || userRole === "2" || userRole === "3";
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsError, setNotificationsError] = useState<string | null>(
    null,
  );

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  // Posts refresh trigger
  const [postsRefreshTrigger, setPostsRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchNotifications();
    fetchAssignments();
  }, [courseId, userToken]);

  const handlePostCreated = () => {
    setPostsRefreshTrigger((prev) => prev + 1);
  };

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    setNotificationsError(null);

    try {
      const request = {
        courseId: courseId,
        userToken: userToken,
        pageSize: 10,
        pageToken: "1",
      } satisfies Partial<ListNotificationsRequest>;

      const response = await listNotifications(
        request as ListNotificationsRequest,
      );
      setNotifications(response.notifications || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setNotificationsError("Failed to load notifications");
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const request = {
        courseId: courseId,
        userToken: userToken,
        pageSize: 20,
        pageToken: "1",
      } satisfies Partial<ListAssignmentsRequest>;

      const response = await listAssignments(request as ListAssignmentsRequest);
      // Only show published assignments to students
      const publishedAssignments = (response.assignments || []).filter(
        (assignment) => !assignment.isDraft || isTeacherOrAdmin,
      );
      setAssignments(publishedAssignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      setAssignmentsError("Failed to load assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Tabs defaultValue="notifications" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-white border border-gray-200 rounded-xl p-2">
          <TabsTrigger
            value="notifications"
            className="text-lg font-semibold h-10"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value="assignments"
            className="text-lg font-semibold h-10"
          >
            Assignments
          </TabsTrigger>
          <TabsTrigger value="posts" className="text-lg font-semibold h-10">
            Posts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6 mt-8">
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
              <CardTitle className="text-2xl font-bold text-gray-900">
                Course Notifications
              </CardTitle>
              <p className="text-gray-600 mt-2">
                Stay updated with the latest course announcements and important information
              </p>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {notificationsLoading ? (
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
                  <span className="ml-3 text-gray-600">Loading notifications...</span>
                </div>
              ) : notificationsError ? (
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
                    Error Loading Notifications
                  </h4>
                  <p className="text-gray-600 mb-4">{notificationsError}</p>
                  <button
                    onClick={fetchNotifications}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : notifications.length === 0 ? (
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
                        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    No Notifications
                  </h4>
                  <p className="text-gray-600">
                    Course announcements and important updates will be shown here. Check regularly for the latest news.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card
                      key={notification.id}
                      className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 mb-2">
                              {notification.title}
                            </h4>
                            <div className="flex items-center text-sm text-gray-500 mb-3">
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
                              {notification.userName}
                              <span className="mx-2">•</span>
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
                              {notification.createdAt
                                ? new Date(
                                    notification.createdAt,
                                  ).toLocaleDateString()
                                : "Unknown Date"}
                            </div>
                          </div>
                        </div>
                        <div className="border-l-4 border-purple-400 pl-4 bg-gray-50 rounded-r-lg p-4">
                          <Markdown
                            content={notification.message}
                            className="prose max-w-none text-gray-700"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6 mt-8">
          <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-gray-100">
              <CardTitle className="flex items-center justify-between">
                <span className="text-2xl font-bold text-gray-900">Assignments</span>
                {isTeacherOrAdmin && (
                  <Link
                    href={`/dashboard/courses/${courseId}/manage?tab=assignments`}
                  >
                    <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-semibold">
                      Manage Assignments
                    </button>
                  </Link>
                )}
              </CardTitle>
              <p className="text-gray-600 mt-2">Complete your assignments and track your progress</p>
            </CardHeader>
            <CardContent className="px-6 py-6">
              {assignmentsLoading ? (
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
                  <span className="ml-3 text-gray-600">Loading assignments...</span>
                </div>
              ) : assignmentsError ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    Error Loading Assignments
                  </h4>
                  <p className="text-gray-600 mb-4">{assignmentsError}</p>
                  <button
                    onClick={fetchAssignments}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
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
                  <p className="text-gray-600 leading-relaxed">
                    Course assignments will be listed here. Check regularly for new assignments and updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <Card
                      key={assignment.id}
                      className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900">
                                {assignment.title}
                              </h4>
                              {assignment.isDraft ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Draft
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Published
                                </span>
                              )}
                            </div>
                            {assignment.description && (
                              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                                {assignment.description}
                              </p>
                            )}
                            <div className="flex items-center text-xs text-gray-500">
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
                                ? new Date(
                                    assignment.createdAt,
                                  ).toLocaleDateString()
                                : "Unknown Date"}
                            </div>
                          </div>
                          <div className="ml-6">
                            <Link
                              href={`/dashboard/courses/${courseId}/assignments/${assignment.id}`}
                            >
                              <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                <svg
                                  className="w-4 h-4 mr-2 inline"
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
                                View Assignment
                              </button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-6 mt-8">
          <div className="space-y-6">
            <CreatePostForm
              courseId={courseId}
              onPostCreated={handlePostCreated}
            />
            <PostList
              courseId={courseId}
              refreshTrigger={postsRefreshTrigger}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Course Management Section for Teachers/Admins */}
      {isTeacherOrAdmin && (
        <Card className="border border-gray-200 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardHeader className="bg-gradient-to-r from-gray-100 to-slate-100 px-6 py-4 border-b border-gray-200">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Course Management
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 py-6">
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                Manage course settings, enrollment requests, assistants, and notifications. Access comprehensive course management tools.
              </p>

              <Link
                href={`/dashboard/courses/${courseId}/manage`}
                className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
              >
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Manage Course
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
