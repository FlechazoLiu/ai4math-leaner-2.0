import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { listUsers, listCourses } from "@/lib/grpc";
import {
  ListUsersRequest,
  ListCoursesRequest,
  Course,
} from "@/lib/gen/leaner/v1/leaner_pb";
import CourseList from "@/components/CourseList";

export default async function Dashboard() {
  const session = await auth();
  const user = session?.user;

  // Only fetch user count data if the user is an admin
  let userCount = null;
  if (user?.role === 1) {
    try {
      const response = await listUsers({} as ListUsersRequest);
      userCount = response.totalCount;
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }

  // Fetch initial enrolled courses for the user
  let initialCourses: Course[] = [];
  try {
    const response = await listCourses({
      pageSize: 50,
      pageToken: "1",
      userToken: user?.token || "",
      isEnrolled: true,
    } as ListCoursesRequest);
    initialCourses = response.courses;
  } catch (error) {
    console.error("Error fetching initial courses:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name}
        </h2>
      </div>

      {/* Admin Role Card */}
      {user?.role === 1 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <div className="h-4 w-4 rounded-full bg-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Admin</div>
              <p className="text-xs text-muted-foreground">Full system access</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="h-4 w-4 text-muted-foreground"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userCount || "N/A"}</div>
              <p className="text-xs text-muted-foreground">Total registered users</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course List Component */}
      <CourseList
        userToken={user?.token || ""}
        userRole={user?.role}
        initialCourses={initialCourses}
        initialFilter="enrolled"
      />
    </div>
  );
}
