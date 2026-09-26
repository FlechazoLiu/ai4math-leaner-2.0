import { auth } from "@/lib/auth";
import { getCourse, getAssignment } from "@/lib/grpc";
import {
  GetCourseRequest,
  GetAssignmentRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { redirect } from "next/navigation";
import EditAssignmentForm from "@/components/EditAssignmentForm";

interface EditAssignmentPageProps {
  params: Promise<{ id: string; assignmentId: string }>;
}

export default async function EditAssignmentPage({
  params,
}: EditAssignmentPageProps) {
  const session = await auth();
  const { id, assignmentId } = await params;

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

    // Get assignment details
    const assignmentResponse = await getAssignment({
      assignmentId: assignmentId,
      userToken: session.user.token,
    } as GetAssignmentRequest);

    const assignment = assignmentResponse.assignment;
    if (!assignment) {
      throw new Error("Assignment data not found");
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center space-x-4 mb-4">
                <a
                  href={`/dashboard/courses/${id}/manage?tab=assignments`}
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
                  <h1 className="text-4xl font-bold text-gray-900">Edit Assignment</h1>
                  <p className="text-lg text-gray-600 mt-2">
                    <span className="font-semibold">{assignment.title}</span> •{" "}
                    {course.title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <EditAssignmentForm
              courseId={id}
              assignment={assignment}
              userToken={session.user.token}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading assignment:", error);
    redirect("/dashboard");
  }
}
