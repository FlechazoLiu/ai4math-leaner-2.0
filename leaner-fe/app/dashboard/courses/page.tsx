"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Course,
  ListCoursesRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { listCourses } from "@/lib/grpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  Plus,
  Search,
  BookOpen,
  Clock,
  ArrowRight,
  Library,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CoursesPage() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "enrolled" | "teaching">("all");
  const [search, setSearch] = useState("");

  const userRole = session?.user?.role;
  const canCreate = userRole && [1, 2, 3].includes(userRole); // Admin or Teacher

  useEffect(() => {
    if (session?.user?.token) {
      loadCourses();
    }
  }, [session, tab]);

  const loadCourses = async () => {
    if (!session?.user?.token) return;
    try {
      setLoading(true);
      const req = {
        pageSize: 100,
        pageToken: "",
        userToken: session.user.token,
        isEnrolled: tab === "enrolled" ? true : undefined,
        isTeaching: tab === "teaching" ? true : undefined,
      } as ListCoursesRequest;
      const resp = await listCourses(req);
      setCourses(resp.courses);
    } catch (e) {
      console.error("Error loading courses:", e);
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const filtered = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.instructorNames.some((n) => n.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and join courses to start your Lean learning journey
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/dashboard/courses/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Course
            </Link>
          </Button>
        )}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "enrolled" | "teaching")}>
          <TabsList>
            <TabsTrigger value="all">All Courses</TabsTrigger>
            <TabsTrigger value="enrolled">My Courses</TabsTrigger>
            <TabsTrigger value="teaching">My Teaching</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Course Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Library className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {search ? "No matching courses" : "No courses yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search
                  ? "Try other keywords"
                  : tab === "enrolled"
                    ? "You haven't joined any courses yet. Browse all courses to join."
                    : tab === "teaching"
                      ? "You are not teaching any courses yet"
                      : "No courses yet. Teachers can create new courses."}
              </p>
              {canCreate && !search && (
                <Button asChild>
                  <Link href="/dashboard/courses/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Create a Course
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/courses/${course.id}`}
              className="group"
            >
              <Card className="h-full hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2">
                    <span className="text-lg group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {course.description || "No course description"}
                  </p>
                  {/* Instructors */}
                  {course.instructorNames.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>
                        {course.instructorNames.slice(0, 3).join(", ")}
                        {course.instructorNames.length > 3
                          ? ` and ${course.instructorNames.length} others`
                          : ""}
                      </span>
                    </div>
                  )}
                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Course
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(course.createdAt).toLocaleDateString("en-US")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
