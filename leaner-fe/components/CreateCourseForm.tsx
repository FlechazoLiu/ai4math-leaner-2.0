"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCourse } from "@/lib/grpc";
import { CreateCourseRequest } from "@/lib/gen/leaner/v1/leaner_pb";

interface CreateCourseFormProps {
  userToken: string;
}

export default function CreateCourseForm({ userToken }: CreateCourseFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Course title is required");
      return;
    }

    if (!description.trim()) {
      setError("Course description is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await createCourse({
        title: title.trim(),
        description: description.trim(),
        userToken: userToken,
      } as CreateCourseRequest);

      // Redirect to the created course or back to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating course:", error);
      setError("Failed to create course. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter course title"
              className="w-full"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Course Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter course description"
              className="w-full min-h-32"
              required
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {isLoading ? "Creating..." : "Create Course"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
