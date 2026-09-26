import { auth } from "@/lib/auth";
import { getCourse } from "@/lib/grpc";
import { GetCourseRequest } from "@/lib/gen/leaner/v1/leaner_pb";
import { redirect } from "next/navigation";
import Link from "next/link";
import CourseManagementTabs from "@/components/CourseManagementTabs";

interface CourseManagePageProps {
  params: Promise<{ id: string }>;
}

export default async function CourseManagePage({
  params,
}: CourseManagePageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.token) {
    redirect("/auth/signin");
  }

  // Check if user has management permissions (admin or teacher)
  const userRole = session.user?.role;
  if (userRole !== 1 && userRole !== 2 && userRole !== 3) {
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

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header with breadcrumb */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {course.title}
                </h1>
                <p className="text-gray-600 mt-1 text-xl">Course Management</p>
              </div>

              <div className="flex space-x-3">
                <Link
                  href={`/dashboard/courses/${id}`}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  View Course
                </Link>
              </div>
            </div>
          </div>

          {/* Course Management Content */}
          <CourseManagementTabs
            courseId={id}
            userToken={session.user.token}
            userRole={userRole}
            course={course}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading course for management:", error);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h1>
            <p className="text-red-600 mb-4">
              You don&apos;t have permission to manage this course, or it doesn&apos;t exist.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}
