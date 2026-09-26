"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/Markdown";
import { createCourseNotification } from "@/lib/course-actions";

interface CreateNotificationFormProps {
  courseId: string;
  courseName: string;
}

export default function CreateNotificationForm({
  courseId,
  courseName,
}: CreateNotificationFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      setError("Please enter both title and message");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createCourseNotification(courseId, title, message);
      if (result.success) {
        router.push(
          `/dashboard/courses/${courseId}/manage?tab=notifications&success=notification-created`,
        );
      } else {
        setError(result.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/dashboard/courses/${courseId}/manage?tab=notifications`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
      {/* Left Column - Input Form */}
      <Card className="border-0 shadow-lg rounded-xl overflow-hidden flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 flex-shrink-0">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Notification Details
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Create a notification for {courseName}
            <span className="font-semibold">{courseName}</span>
          </p>
        </CardHeader>
        <CardContent className="px-8 py-8 flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-lg font-semibold text-gray-900"
                >
                  NotificationsTitle
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="text-lg h-12"
                  disabled={loading}
                />
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="message"
                  className="text-lg font-semibold text-gray-900"
                >
                  Message
                </Label>
                <p className="text-sm text-gray-600 mb-2">
                  You can use Markdown formatting, including math expressions and LaTeX syntax.
                </p>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter your message...

**You can use Markdown formatting:**
- *Italic text*
- **Bold text**
- Lists and bullet points
- Math equations: $E = mc^2$
- Code blocks and more!"
                  className="min-h-[400px] text-base leading-relaxed resize-y"
                  disabled={loading}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-gray-200 flex-shrink-0">
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
              disabled={loading || !title.trim() || !message.trim()}
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
                  Sending...
                </>
              ) : (
                "Send Notification"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Right Column - Preview */}
      <Card className="border-0 shadow-lg rounded-xl overflow-hidden flex flex-col">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 flex-shrink-0">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Live Preview
          </CardTitle>
          <p className="text-gray-600 mt-2">See how your notification looks to students</p>
        </CardHeader>
        <CardContent className="px-8 py-8 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-2 -mr-2">
            {title || message ? (
              <div className="space-y-6">
                {/* Preview Title */}
                {title && (
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-2">
                      {title}
                    </h3>
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Now • {courseName}
                    </div>
                  </div>
                )}

                {/* Preview Message */}
                {message && (
                  <div className="border-l-4 border-blue-500 pl-6">
                    <Markdown
                      content={message}
                      className="prose-lg max-w-none"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-gray-400"
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
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Preview Your Notification
                  </h4>
                  <p className="text-gray-600">
                    Start typing in the form to see how your notification looks to students.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
