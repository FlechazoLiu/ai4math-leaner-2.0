import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import CreateCourseForm from "@/components/CreateCourseForm";

export default async function CreateCoursePage() {
  const session = await auth();
  const user = session?.user;

  // Check if user is authenticated
  if (!user) {
    redirect("/auth/signin");
  }

  // Check if user has permission to create courses (Admin or Teacher)
  if (user.role !== 1 && user.role !== 2) {
    redirect("/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Create New Course</h1>
        <p className="text-gray-600">Create a new course for students to enroll in.</p>
      </div>

      <CreateCourseForm userToken={user.token || ""} />
    </div>
  );
}
