"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { createPost, updatePost } from "@/lib/grpc";
import {
  CreatePostRequest,
  UpdatePostRequest,
  Post,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import { Send, Eye, Edit3 } from "lucide-react";

interface CreatePostFormProps {
  courseId: string;
  onPostCreated?: () => void;
  editingPost?: Post | null;
  onEditComplete?: () => void;
}

export default function CreatePostForm({
  courseId,
  onPostCreated,
  editingPost,
  onEditComplete,
}: CreatePostFormProps) {
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");

  // Initialize form with editing post data
  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title);
      setContent(editingPost.content);
    } else {
      setTitle("");
      setContent("");
    }
  }, [editingPost]);

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!session?.user?.token) {
      toast.error("You must be logged in to create a post");
      return;
    }

    if (!title.trim()) {
      toast.error("Please enter a title for your post");
      return;
    }

    if (!content.trim()) {
      toast.error("Please enter content for your post");
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingPost) {
        // Update existing post
        const request = {
          postId: editingPost.id,
          userToken: session.user.token,
          title: title.trim(),
          content: content.trim(),
          isDraft: asDraft,
        } as UpdatePostRequest;

        await updatePost(request);
        toast.success(
          asDraft ? "Post saved as draft" : "Post updated successfully",
        );

        if (onEditComplete) {
          onEditComplete();
        }
      } else {
        // Create new post
        const request = {
          title: title.trim(),
          content: content.trim(),
          userToken: session.user.token,
          courseId: courseId,
          isDraft: asDraft,
        } as CreatePostRequest;

        await createPost(request);
        toast.success(
          asDraft ? "Post saved as draft" : "Post published successfully",
        );

        // Reset form
        setTitle("");
        setContent("");
        setActiveTab("edit");

        // Notify parent component
        if (onPostCreated) {
          onPostCreated();
        }
      }
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save post",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          {editingPost ? "Edit Post" : "Create New Post"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Title Input */}
        <div className="space-y-2">
          <Label htmlFor="post-title">Title</Label>
          <Input
            id="post-title"
            placeholder="Enter post title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Content Editor with Tabs */}
        <div className="space-y-2">
          <Label>Content</Label>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="mt-4">
              <Textarea
                placeholder="Write your post content in Markdown..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[400px] resize-none font-mono text-sm"
              />
              <p className="text-sm text-gray-500 mt-2">
                You can use Markdown syntax for formatting. Switch to preview to see the result.
              </p>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="min-h-[400px] border rounded-md p-4 bg-gray-50">
                {content.trim() ? (
                  <Markdown content={content} />
                ) : (
                  <p className="text-gray-500 italic">
                    No content to preview. Start writing in the edit tab!
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting || !title.trim() || !content.trim()}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting
              ? editingPost
                ? "Updating..."
                : "Publishing..."
              : editingPost
                ? "Update Post"
                : "Publish Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
