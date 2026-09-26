"use client";

import { useCallback, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCourses } from "@/lib/grpc";
import {
  ListCoursesRequest,
  Course,
} from "@/lib/gen/leaner/v1/leaner_pb";
import Link from "next/link";

interface CourseListProps {
  userToken: string;
  userRole?: number;
  initialCourses?: Course[];
  initialFilter?: string;
}

export default function CourseList({
  userToken,
  userRole,
  initialCourses = [],
  initialFilter = "enrolled",
}: CourseListProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const filter = searchParams.get("filter") || initialFilter;

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [isPending, startTransition] = useTransition();
  const [currentFilter, setCurrentFilter] = useState(filter);

  const fetchCourses = useCallback(async (newFilter: string) => {
    try {
      const isEnrolled = newFilter === "enrolled";
      const isTeaching = newFilter === "teaching";
      const request = {
        pageSize: 50,
        pageToken: "1",
        userToken: userToken,
        isEnrolled: isEnrolled,
        isTeaching: isTeaching,
      } satisfies Partial<ListCoursesRequest>;
      const response = await listCourses(request as ListCoursesRequest);
      setCourses(response.courses);
      setCurrentFilter(newFilter);
    } catch (error) {
      console.error("Error fetching courses:", error);
      setCourses([]);
    }
  }, [userToken]);

  const handleFilterChange = (newFilter: string) => {
    startTransition(() => {
      fetchCourses(newFilter);
      const params = new URLSearchParams(searchParams.toString());
      params.set("filter", newFilter);
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold">Courses</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => handleFilterChange("enrolled")}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentFilter === "enrolled"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              disabled={isPending}
            >
              Enrolled
            </button>
            {/* Teaching filter - Only for Teachers and Admins */}
            {(userRole === 1 || userRole === 2) && (
              <button
                onClick={() => handleFilterChange("teaching")}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  currentFilter === "teaching"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                disabled={isPending}
              >
                Teaching
              </button>
            )}
          </div>
        </div>

        {/* Create Course Button - Only for Teachers and Admins */}
        {(userRole === 1 || userRole === 2) && (
          <Link
            href="/dashboard/courses/create"
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
          >
            Create Course
          </Link>
        )}
      </div>

      {/* Courses Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isPending ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">Loading courses...</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-gray-500">
              {currentFilter === "enrolled"
                ? "You are not enrolled in any courses yet."
                : currentFilter === "teaching"
                  ? "You are not teaching any courses yet."
                  : "No courses available."}
            </p>
          </div>
        ) : (
          courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">{course.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {course.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Created: {new Date(course.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <Link
                      href={
                        currentFilter === "teaching" &&
                        (userRole === 1 || userRole === 2)
                          ? `/dashboard/courses/${course.id}/manage`
                          : `/dashboard/courses/${course.id}`
                      }
                      className="text-sm bg-gray-900 text-white px-3 py-1 rounded-md hover:bg-gray-800 transition-colors"
                    >
                      {currentFilter === "teaching" &&
                      (userRole === 1 || userRole === 2)
                        ? "Manage"
                        : "View"}
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
