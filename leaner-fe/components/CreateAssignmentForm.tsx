"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { createAssignment } from "@/lib/grpc";
import { CreateAssignmentRequest } from "@/lib/gen/leaner/v1/leaner_pb";

interface CreateAssignmentFormProps {
  courseId: string;
  courseName: string;
  userToken: string;
}

export default function CreateAssignmentForm({
  courseId,
  courseName,
  userToken,
}: CreateAssignmentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Assignment title is required");
      return;
    }

    if (!description.trim()) {
      setError("Assignment description is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = {
        courseId: courseId,
        userToken: userToken,
        title: title.trim(),
        description: description.trim(),
        isDraft: true, // Create as draft
      } satisfies Partial<CreateAssignmentRequest>;

      const response = await createAssignment(
        request as CreateAssignmentRequest,
      );

      // Redirect to the assignment edit page where questions can be added
      router.push(
        `/dashboard/courses/${courseId}/assignments/${response.assignment?.id}/edit`,
      );
    } catch (error) {
      console.error("Error creating assignment:", error);
      setError("Failed to create assignment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/manage?tab=assignments`);
  };

  return (
    <div className="space-y-8">
      {/* Assignment Details Form */}
      <Card className="border border-gray-200 shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <CardTitle className="text-2xl font-bold text-white flex items-center">
            <svg
              className="w-7 h-7 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Assignment Details
          </CardTitle>
          <p className="text-blue-100 mt-2">
            Create a new assignment for {courseName}. You can add questions after saving the draft.
          </p>
        </CardHeader>
        <CardContent className="px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Input Form */}
            <div className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-lg font-semibold text-gray-900"
                >
                  AssignmentsTitle *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter assignment title..."
                  className="text-lg h-12"
                  disabled={loading}
                />
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-lg font-semibold text-gray-900"
                >
                  AssignmentsDescription *
                </Label>
                <p className="text-sm text-gray-600 mb-2">
                  Provide detailed instructions and requirements. You can use Markdown formatting.
                </p>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter assignment description and instructions...

**Assignment Overview:**
- Learning objectives
- Requirements
- Submission guidelines

**Instructions:**
1. Step 1
2. Step 2
3. Step 3

**Evaluation Criteria:**
- Criterion 1
- Criterion 2"
                  className="min-h-[300px] text-base leading-relaxed resize-y"
                  disabled={loading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-6 py-3 text-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !title.trim() || !description.trim()}
                  className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating draft...
                    </>
                  ) : (
                    "Save as Draft"
                  )}
                </Button>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <div className="sticky top-4">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Live Preview
                  </h3>

                  {title || description ? (
                    <div className="space-y-4">
                      {/* Preview Title */}
                      {title && (
                        <div>
                          <h4 className="text-2xl font-bold text-gray-900 mb-2">
                            {title}
                          </h4>
                          <div className="flex items-center text-sm text-gray-500 mb-4">
                            <svg
                              className="w-4 h-4 mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            Draft Assignment • {courseName}
                          </div>
                        </div>
                      )}

                      {/* Preview Description */}
                      {description && (
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <Markdown
                            content={description}
                            className="prose max-w-none"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Preview Your Assignment
                      </h4>
                      <p className="text-gray-600">
                        Fill out the form to see how your assignment will appear to students.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps Info */}
      <Card className="border border-blue-200 bg-blue-50 rounded-xl overflow-hidden">
        <CardContent className="px-6 py-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Next Steps
              </h3>
              <div className="text-blue-800 space-y-1">
                <p>
                  1. <strong>Save as Draft:</strong> Create the basic details of the assignment
                </p>
                <p>
                  2. <strong>Add Questions:</strong> You will be redirected to add assignment questions
                </p>
                <p>
                  3. <strong>Review and Publish:</strong> Preview and publish the assignment for students
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
