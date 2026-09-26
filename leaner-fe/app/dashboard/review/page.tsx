"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { create } from "@bufbuild/protobuf";
import {
  Assignment,
  Course,
  ListCoursesRequestSchema,
  ListAssignmentsRequestSchema,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listAssignments,
  listCourses,
} from "@/lib/grpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Filter,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

export default function ReviewPage() {
  const { data: session } = useSession();
  const canReview = session?.user?.role && [1, 2, 3].includes(session.user.role);

  // Course & assignment selection
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  useEffect(() => {
    if (canReview && session?.user?.token) loadCourses();
  }, [session, canReview]);

  const loadCourses = async () => {
    if (!session?.user?.token) return;
    setCoursesLoading(true);
    try {
      const resp = await listCourses(create(ListCoursesRequestSchema, {
        pageSize: 50, pageToken: "1", isTeaching: true, userToken: session.user.token,
      }));
      setCourses(resp.courses);
      if (resp.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(resp.courses[0].id);
      }
    } catch (e) {
      console.error("Error loading courses:", e);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId && canReview) loadAssignments();
  }, [selectedCourseId]);

  const loadAssignments = async () => {
    if (!session?.user?.token) return;
    setAssignmentsLoading(true);
    setAssignments([]);
    try {
      const resp = await listAssignments(create(ListAssignmentsRequestSchema, {
        courseId: selectedCourseId, userToken: session.user.token, pageSize: 50, pageToken: "1",
      }));
      const published = resp.assignments.filter(a => !a.isDraft);
      setAssignments(published);
    } catch (e) {
      console.error("Error loading assignments:", e);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  if (!canReview) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">Only teachers, assistants, and admins can access the review page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Review Workbench</h1>
          <p className="text-sm text-muted-foreground mt-1">Grade student-submitted assignment answers</p>
        </div>
      </div>

      <Tabs defaultValue="assignment">
        <TabsList>
          <TabsTrigger value="assignment" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />Assignment Grading
          </TabsTrigger>
          <TabsTrigger value="exercise" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />Exercise Answers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignment" className="mt-4 space-y-6">
          {/* Course selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />Select Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="space-y-2 flex-1">
                  <Label>Course</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    disabled={coursesLoading || courses.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={coursesLoading ? "Loading..." : "Select a course..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assignment list */}
          {selectedCourseId && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Assignments</h2>
              {assignmentsLoading ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Loading assignments...</CardContent></Card>
              ) : assignments.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">No published assignments found.</CardContent></Card>
              ) : (
                assignments.map(a => (
                  <Card key={a.id} className="hover:shadow-md transition-shadow">
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{a.title}</h3>
                        {a.description && (
                          <p className="text-sm text-muted-foreground truncate mt-1">{a.description}</p>
                        )}
                      </div>
                      <Button asChild>
                        <Link href={`/dashboard/review/assignment/${a.id}`}>
                          Grade <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exercise" className="mt-4">
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            Use the Assignment Grading tab for course-based grading.
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
