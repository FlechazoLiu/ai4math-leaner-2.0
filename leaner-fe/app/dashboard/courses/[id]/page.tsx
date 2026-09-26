import { auth } from "@/lib/auth";
import { getCourse, checkEnrollment } from "@/lib/grpc";
import { create } from "@bufbuild/protobuf";
import { GetCourseRequestSchema, CheckEnrollmentRequestSchema, Role } from "@/lib/gen/leaner/v1/leaner_pb";
import { redirect } from "next/navigation";
import EnrolledCourseContent from "../../../../components/EnrolledCourseContent";
import { Markdown } from "@/components/Markdown";
import Link from "next/link";

interface CoursePageProps {
  params: Promise<{ id: string }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.token) {
    redirect("/auth/signin");
  }

  const userRole = session.user?.role;

  try {
    // Get course details
    const courseResponse = await getCourse(create(GetCourseRequestSchema, {
      courseId: id,
      userToken: session.user.token,
    }));

    const course = courseResponse.course;
    if (!course) {
      throw new Error("Course data not found");
    }

    // Check enrollment/assignment for non-admin roles
    if (userRole === undefined || userRole === Role.STUDENT || userRole === Role.ASSISTANT) {
      const enrollmentCheck = await checkEnrollment(create(CheckEnrollmentRequestSchema, {
        courseId: id,
        userToken: session.user.token,
      }));
      if (!enrollmentCheck.isEnrolled) {
        const isAssistant = userRole === Role.ASSISTANT;
        return (
          <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="max-w-md mx-auto px-6 text-center">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                <div className="w-20 h-20 mx-auto mb-6 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-6.364a9 9 0 110-12.728 9 9 0 010 12.728z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">
                  {isAssistant ? "Not an Assistant" : "Not Enrolled"}
                </h1>
                <p className="text-gray-600 mb-8">
                  {isAssistant
                    ? "You are not assigned as an assistant for this course. Please contact the teacher if you believe this is an error."
                    : "You are not enrolled in this course. Please contact your teacher or administrator to request access."}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 border-b border-gray-200">
          <div className="container mx-auto px-6 py-12">
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Course Information
                    </h3>
                    {/* Management link for admins & teachers */}
                    {userRole && [1, 2, 3].includes(userRole) && (
                      <Link
                        href={`/dashboard/courses/${id}/manage`}
                        className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-full text-sm font-semibold hover:bg-white/30 transition-colors"
                      >
                        Manage Course
                      </Link>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="px-8 py-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                      <div>
                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-2">
                          {course.title}
                        </h1>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-600 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          {course.instructorNames && course.instructorNames.length === 1 ? "Teacher" : "Teaching Team"}
                        </h2>
                        {course.instructorNames && course.instructorNames.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {course.instructorNames.map((name: string, index: number) => (
                              <div key={index}
                                className="inline-flex items-center bg-blue-50 text-blue-800 px-4 py-2 rounded-full text-base font-semibold border border-blue-200 hover:bg-blue-100 transition-colors">
                                <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {name}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No teachers assigned</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-600 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Course Description
                      </h2>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="text-gray-700 leading-relaxed">
                          <Markdown content={course.description}
                            className="prose max-w-none prose-headings:text-gray-900 prose-a:text-blue-600 prose-strong:text-gray-900" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Course Content — always visible */}
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <EnrolledCourseContent
              courseId={id}
              userToken={session.user.token}
              userRole={userRole?.toString() || "STUDENT"}
            />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error loading course:", error);

    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-500"
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
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Course Not Found
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              The course you are looking for does not exist or you don&apos;t have permission to access it.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
