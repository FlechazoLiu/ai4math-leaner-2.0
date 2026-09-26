import { auth } from "@/lib/auth";
import { getCourse, listNotifications } from "@/lib/grpc";
import {
  GetCourseRequest,
  ListNotificationsRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { redirect } from "next/navigation";
import EditNotificationForm from "@/components/EditNotificationForm";

interface EditNotificationPageProps {
  params: Promise<{ id: string; notificationId: string }>;
}

export default async function EditNotificationPage({
  params,
}: EditNotificationPageProps) {
  const session = await auth();
  const { id, notificationId } = await params;

  if (!session?.user?.token) {
    redirect("/auth/signin");
  }

  // Check if user has permission (admin or teacher)
  if (!session.user.role || ![1, 2, 3].includes(session.user.role)) {
    redirect("/dashboard");
  }

  try {
    // Get course details
    const courseResponse = await getCourse({
      courseId: id,
      userToken: session.user.token,
    } as GetCourseRequest);

    const course = courseResponse.course;
    if (!course) {
      throw new Error("Course data not found");
    }

    // Get all notifications to find the specific one
    const notificationsRequest = {
      courseId: id,
      userToken: session.user.token,
      pageSize: 100,
      pageToken: "1",
    } satisfies Partial<ListNotificationsRequest>;

    const notificationsResponse = await listNotifications(
      notificationsRequest as ListNotificationsRequest,
    );
    const notification = notificationsResponse.notifications?.find(
      (n) => n.id === notificationId,
    );

    if (!notification) {
      redirect(`/dashboard/courses/${id}/manage?tab=notifications`);
    }

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center space-x-4 mb-4">
                <a
                  href={`/dashboard/courses/${id}/manage?tab=notifications`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </a>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Edit Notification</h1>
                  <p className="text-lg text-gray-600 mt-2">
                    Update Notification
                    <span className="font-semibold">{course.title}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <EditNotificationForm
              courseId={id}
              courseName={course.title}
              notification={notification}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading notification:", error);
    redirect("/dashboard");
  }
}
