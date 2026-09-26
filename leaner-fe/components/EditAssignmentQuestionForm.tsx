"use client";

import { useState, useEffect } from "react";
import {
  UpdateAssignmentQuestionRequest,
  AssignmentQuestion,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { updateAssignmentQuestion } from "@/lib/grpc";
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
import { toast } from "sonner";

interface EditAssignmentQuestionFormProps {
  question: AssignmentQuestion;
  userToken: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export default function EditAssignmentQuestionForm({
  question,
  userToken,
  onSuccess,
  trigger,
}: EditAssignmentQuestionFormProps) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [informalDescription, setInformalDescription] = useState("");
  const [formalDescription, setFormalDescription] = useState("");

  // Initialize form with question data
  useEffect(() => {
    if (question) {
      setTitle(question.title);
      setInformalDescription(question.informalDescription);
      setFormalDescription(question.formalDescription || "");
    }
  }, [question]);

  const resetForm = () => {
    if (question) {
      setTitle(question.title);
      setInformalDescription(question.informalDescription);
      setFormalDescription(question.formalDescription || "");
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Question title is required");
      return;
    }

    if (!informalDescription.trim()) {
      toast.error("Informal description is required");
      return;
    }

    try {
      setUpdating(true);
      const request = {
        questionId: question.id,
        title: title.trim(),
        informalDescription: informalDescription.trim(),
        formalDescription: formalDescription.trim() || undefined,
        userToken: userToken,
      } as UpdateAssignmentQuestionRequest;

      await updateAssignmentQuestion(request);
      toast.success("Assignment question updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating assignment question:", error);
      toast.error("Failed to update assignment question");
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold text-gray-900">
            EditAssignmentsQuestion
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto pr-4 -mr-4">
            <div className="space-y-6 py-2">
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
                  disabled={updating}
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
                  Provide a clear question description explaining what students need to do. You can use
                  Markdown formatting.
                </p>
                <Textarea
                  id="informalDescription"
                  value={informalDescription}
                  onChange={(e) => setInformalDescription(e.target.value)}
                  placeholder="Describe the question in detail. What should students solve or explain?"
                  className="min-h-[200px] text-sm leading-relaxed resize-y"
                  disabled={updating}
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
                  disabled={updating}
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
              onClick={() => setOpen(false)}
              disabled={updating}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={
                updating || !title.trim() || !informalDescription.trim()
              }
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              {updating ? (
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
                  Updating...
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Update Question
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
