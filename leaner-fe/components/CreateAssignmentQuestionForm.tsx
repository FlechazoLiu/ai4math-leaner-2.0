"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/Markdown";
import { CodeBlock } from "@/components/CodeBlock";
import { createAssignmentQuestion } from "@/lib/grpc";
import { CreateAssignmentQuestionRequest } from "@/lib/gen/leaner/v1/leaner_pb";

interface CreateAssignmentQuestionFormProps {
  courseId: string;
  assignmentId: string;
  userToken: string;
  onSuccess: () => void;
  trigger: React.ReactNode;
}

export default function CreateAssignmentQuestionForm({
  courseId,
  assignmentId,
  userToken,
  onSuccess,
  trigger,
}: CreateAssignmentQuestionFormProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [informalDescription, setInformalDescription] = useState("");
  const [formalDescription, setFormalDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !informalDescription.trim()) {
      setError("Title and informal description are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request = {
        courseId: courseId,
        title: title.trim(),
        informalDescription: informalDescription.trim(),
        formalDescription: formalDescription.trim() || undefined,
        assignmentId: assignmentId,
        userToken: userToken,
      } as CreateAssignmentQuestionRequest;

      await createAssignmentQuestion(request);

      // Reset form
      setTitle("");
      setInformalDescription("");
      setFormalDescription("");
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating assignment question:", error);
      setError("Failed to create assignment question. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setInformalDescription("");
    setFormalDescription("");
    setError(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Create Assignment Question
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-4 -mr-4">
            <div className="space-y-6 py-2">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-sm font-semibold text-gray-900"
                >
                  QuestionTitle *
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a clear, concise question title"
                  className="text-sm h-10"
                  disabled={loading}
                  required
                />
              </div>

              {/* Informal Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="informalDescription"
                  className="text-sm font-semibold text-gray-900"
                >
                  QuestionDescription *
                </Label>
                <p className="text-xs text-gray-600">
                  Provide a clear question description explaining what the student needs to do. You can use
                  Markdown formatting.
                </p>
                <Textarea
                  id="informalDescription"
                  value={informalDescription}
                  onChange={(e) => setInformalDescription(e.target.value)}
                  placeholder="Describe the question in detail. What does the student need to solve or explain?"
                  className="min-h-[200px] text-sm leading-relaxed resize-y"
                  disabled={loading}
                  required
                />
              </div>

              {/* Preview of Informal Description */}
              {informalDescription && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">
                    Description Preview
                  </Label>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <Markdown
                      content={informalDescription}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              )}

              {/* Formal Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="formalDescription"
                  className="text-sm font-semibold text-gray-900"
                >
                  Formal Description (Optional)
                </Label>
                <p className="text-xs text-gray-600">
                  Add formal code (Optional).
                </p>
                <Textarea
                  id="formalDescription"
                  value={formalDescription}
                  onChange={(e) => setFormalDescription(e.target.value)}
                  placeholder="Add formal code (Optional)"
                  className="min-h-[120px] text-sm leading-relaxed resize-y font-mono"
                  disabled={loading}
                />
              </div>

              {/* Preview of Formal Description */}
              {formalDescription && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">
                    Formal Description Preview
                  </Label>
                  <CodeBlock
                    code={formalDescription}
                    language="lean4"
                    className="text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex-shrink-0 flex justify-end space-x-3 pt-4 border-t border-gray-200 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !informalDescription.trim()}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 mr-2"
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
                  Creating...
                </>
              ) : (
                <>
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Question
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
