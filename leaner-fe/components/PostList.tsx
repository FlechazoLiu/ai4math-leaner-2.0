"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { listPosts, deletePost } from "@/lib/grpc";
import {
  ListPostsRequest,
  DeletePostRequest,
  Post,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";
import {
  MessageSquare,
  User,
  Calendar,
  Edit3,
  Trash2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import CreatePostForm from "@/components/CreatePostForm";

interface PostListProps {
  courseId: string;
  refreshTrigger?: number;
}

export default function PostList({ courseId, refreshTrigger }: PostListProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState<Set<string>>(new Set());
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const loadPosts = async () => {
    if (!session?.user?.token) return;

    try {
      setLoading(true);
      const request = {
        pageSize: 50,
        pageToken: "1",
        userToken: session.user.token,
        courseId: courseId,
      } as ListPostsRequest;

      const response = await listPosts(request);
      setPosts(response.posts || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, [courseId, session?.user?.token, refreshTrigger]);

  const togglePostExpanded = (postId: string) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedPosts(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const isPostAuthor = (post: Post) => {
    return session?.user?.id === post.userId;
  };

  const handleEditComplete = () => {
    setEditingPost(null);
    loadPosts(); // Refresh the posts list
  };

  const handleDeletePost = async (postId: string) => {
    if (!session?.user?.token) return;

    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;

    try {
      const request = {
        postId: postId,
        userToken: session.user.token,
      } as DeletePostRequest;

      await deletePost(request);
      toast.success("Post deleted");
      loadPosts(); // Refresh the posts list
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Course Posts</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Course Posts</h2>
        <Badge variant="secondary">{posts.length} posts</Badge>
      </div>

      {/* Edit Form */}
      {editingPost && (
        <CreatePostForm
          courseId={courseId}
          editingPost={editingPost}
          onEditComplete={handleEditComplete}
        />
      )}

      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Posts</h3>
            <p className="text-gray-500">Be the first to share something!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const isExpanded = expandedPosts.has(post.id);
            const isAuthor = isPostAuthor(post);

            return (
              <Card key={post.id} className="hover:shadow-md transition-shadow">
                <CardHeader
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => togglePostExpanded(post.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        {post.title}
                        {post.isDraft && (
                          <Badge variant="outline" className="text-xs">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Link
                        href={`/dashboard/courses/${courseId}/posts/${post.id}`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      {isAuthor && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPost(post);
                            }}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePost(post.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePostExpanded(post.id)}
                      >
                        {isExpanded ? "Show Less" : "Read More"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="prose prose-gray max-w-none">
                      <Markdown content={post.content} />
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
