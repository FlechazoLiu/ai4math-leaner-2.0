"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getPost, deletePost } from "@/lib/grpc";
import {
  GetPostRequest,
  DeletePostRequest,
  Post,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Calendar,
  Edit3,
  Trash2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import PostCommentSection from "@/components/PostCommentSection";
import CreatePostForm from "@/components/CreatePostForm";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const courseId = params.id as string;
  const postId = params.postId as string;

  useEffect(() => {
    if (courseId && postId && session?.user?.token) {
      loadPost();
    }
  }, [courseId, postId, session?.user?.token]);

  const loadPost = async () => {
    if (!session?.user?.token) return;

    try {
      setLoading(true);
      const request = {
        postId: postId,
        userToken: session.user.token,
      } as GetPostRequest;

      const response = await getPost(request);

      if (response.post) {
        setPost(response.post);
      } else {
        toast.error("Post not found");
        router.push(`/dashboard/courses/${courseId}`);
      }
    } catch (error) {
      console.error("Error loading post:", error);
      toast.error("Failed to load post");
      router.push(`/dashboard/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const isPostAuthor = () => {
    return session?.user?.id === post?.userId;
  };

  const handleEditComplete = () => {
    setEditing(false);
    loadPost(); // Refresh the post data
  };

  const handleDeletePost = async () => {
    if (!session?.user?.token || !post) return;

    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;

    try {
      const request = {
        postId: post.id,
        userToken: session.user.token,
      } as DeletePostRequest;

      await deletePost(request);
      toast.success("Post deleted successfully");
      router.push(`/dashboard/courses/${courseId}`);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h1>
          <Link href={`/dashboard/courses/${courseId}`}>
            <Button>Back to Course</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Link href={`/dashboard/courses/${courseId}`}>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Course
              </Button>
            </Link>

            {isPostAuthor() && !editing && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Post
                </Button>
                <Button variant="outline" onClick={handleDeletePost}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Post Content or Edit Form */}
          {editing ? (
            <CreatePostForm
              courseId={courseId}
              editingPost={post}
              onEditComplete={handleEditComplete}
            />
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold mb-4">
                      {post.title}
                      {post.isDraft && (
                        <Badge variant="outline" className="ml-3">
                          Draft
                        </Badge>
                      )}
                    </CardTitle>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{post.userName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(post.createdAt || "")}</span>
                      </div>
                      {post.createdAt !== post.updatedAt && (
                        <span className="italic">(edited)</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="prose prose-gray max-w-none">
                  <Markdown content={post.content} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments Section */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PostCommentSection postId={postId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
