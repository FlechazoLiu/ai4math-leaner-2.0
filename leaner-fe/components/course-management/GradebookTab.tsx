"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  listAssignments,
  listCourseStudents,
  listAssignmentAnswers,
  listAssignmentQuestions,
} from "@/lib/grpc";
import {
  ListAssignmentsRequest,
  ListCourseStudentsRequest,
  ListAssignmentAnswersRequest,
  ListAssignmentQuestionsRequest,
  Assignment,
  User,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { useSession } from "next-auth/react";
import { BookOpen, ExternalLink } from "lucide-react";

interface GradebookTabProps {
  courseId: string;
}

interface CellData {
  score: number;
  answerId: string;
}

export default function GradebookTab({ courseId }: GradebookTabProps) {
  const { data: session } = useSession();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [cellData, setCellData] = useState<Record<string, Record<string, CellData>>>({});
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!session?.user?.token) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Load assignments
      const assignResp = await listAssignments({
        courseId,
        userToken: session.user.token,
        pageSize: 100,
        pageToken: "1",
      } as ListAssignmentsRequest);
      const published = (assignResp.assignments || []).filter((a) => !a.isDraft);
      setAssignments(published);

      // 2. Load students
      const studentsResp = await listCourseStudents({
        courseId,
        userToken: session.user.token,
        pageSize: 200,
        pageToken: "",
      } as ListCourseStudentsRequest);
      const enrolled = studentsResp.students || [];
      setStudents(enrolled);

      // 3. For each assignment, get questions then answers with grades
      const grades: Record<string, Record<string, CellData>> = {};

      for (const assignment of published) {
        // Get questions for this assignment
        const qResp = await listAssignmentQuestions({
          assignmentId: assignment.id,
          userToken: session.user.token,
          pageSize: 100,
          pageToken: "1",
        } as ListAssignmentQuestionsRequest);
        const questions = qResp.questions || [];

        // For each question, get submitted answers
        for (const question of questions) {
          const aResp = await listAssignmentAnswers({
            assignmentQuestionId: question.id,
            userToken: session.user.token,
            pageSize: 500,
            pageToken: "1",
            excludeDrafts: true,
          } as ListAssignmentAnswersRequest);
          const answers = aResp.answers || [];

          for (const answer of answers) {
            const studentId = answer.authorId;
            const gradesList = answer.grades || [];
            if (gradesList.length > 0) {
              const grade = gradesList[0]; // First grade entry
              if (!grades[studentId]) grades[studentId] = {};
              if (!grades[studentId][assignment.id]) {
                grades[studentId][assignment.id] = { score: 0, answerId: answer.id };
              }
              grades[studentId][assignment.id].score += grade.grade;
            }
          }
        }
      }

      setCellData(grades);
    } catch (e) {
      console.error("Error loading gradebook:", e);
      setError("Failed to load gradebook data");
    } finally {
      setLoading(false);
    }
  }, [courseId, session]);

  useEffect(() => {
    if (session?.user?.token) loadData();
  }, [session, loadData]);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Gradebook</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Gradebook</CardTitle></CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={loadData} variant="outline" size="sm" className="mt-2">Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5" />
            Gradebook
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {students.length} students · {assignments.length} assignments
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {assignments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No published assignments yet. Publish an assignment to see grades here.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-semibold text-xs sticky left-0 bg-white z-10">Student</th>
                  {assignments.map((a) => (
                    <th key={a.id} className="text-center py-2 px-2 min-w-[80px] max-w-[110px]">
                      <div className="text-xs font-semibold truncate" title={a.title}>{a.title}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const studentGrades = cellData[student.id] || {};
                  return (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 sticky left-0 bg-white text-xs">
                        <span className="font-medium">{student.displayName || student.username}</span>
                        {student.studentId && <span className="text-muted-foreground ml-1">({student.studentId})</span>}
                      </td>
                      {assignments.map((a) => {
                        const cell = studentGrades[a.id];
                        return (
                          <td key={a.id} className="text-center py-2 px-2">
                            {cell ? (
                              <Link
                                href={`/dashboard/review/${cell.answerId}/grade?type=assignment`}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-xs font-medium"
                                title="Click to view submission"
                              >
                                {cell.score}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
