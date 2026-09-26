import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssignment } from "@/lib/grpc";
import { GetAssignmentRequest } from "@/lib/gen/leaner/v1/leaner_pb";
import AssignmentView from "@/components/AssignmentView";

interface AssignmentPageProps {
  params: Promise<{
    id: string;
    assignmentId: string;
  }>;
}

export default async function AssignmentPage({ params }: AssignmentPageProps) {
  const session = await auth();

  if (!session?.user?.token) {
    redirect("/auth/signin");
  }

  const resolvedParams = await params;

  try {
    // Fetch assignment details
    const assignmentRequest = {
      assignmentId: resolvedParams.assignmentId,
      userToken: session.user.token,
    } satisfies Partial<GetAssignmentRequest>;

    const assignmentResponse = await getAssignment(
      assignmentRequest as GetAssignmentRequest,
    );

    if (!assignmentResponse.assignment) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Assignment not found
            </h1>
            <p className="text-gray-600">The assignment you are looking for does not exist.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AssignmentView
            assignment={assignmentResponse.assignment}
            courseId={resolvedParams.id}
            userToken={session.user.token}
            userRole={session.user.role || 4}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Failed to load assignment
          </h1>
          <p className="text-gray-600">An error occurred while loading the assignment. Please try again later.</p>
        </div>
      </div>
    );
  }
}
