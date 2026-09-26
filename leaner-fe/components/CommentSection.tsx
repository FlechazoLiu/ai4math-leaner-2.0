"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Comment,
  ListCommentsRequest,
  CreateCommentRequest,
  UpdateCommentRequest,
  DeleteCommentRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";
import {
  listComments,
  createComment,
  updateComment,
  deleteComment,
} from "@/lib/grpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MessageCircle, Reply, Edit, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Markdown } from "@/components/Markdown";

interface CommentSectionProps {
  postId: string;
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

export default function CommentSection({ postId }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (session?.user?.token) {
      loadComments();
    }
  }, [postId, session]);

  const loadComments = async () => {
    if (!session?.user?.token) return;

    try {
      setLoading(true);
      const request = {
        postId,
        userToken: session.user.token,
        pageSize: 50,
        pageToken: "1",
      } as ListCommentsRequest;

      const response = await listComments(request);

      console.log("Raw comments from backend:", response.comments);

      // Organize comments into tree structure
      const commentsMap = new Map<string, CommentWithReplies>();
      const topLevelComments: CommentWithReplies[] = [];

      // First pass: create all comment objects
      response.comments.forEach((comment) => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      // Second pass: organize into tree structure
      response.comments.forEach((comment) => {
        const commentWithReplies = commentsMap.get(comment.id)!;
        if (comment.parentCommentId) {
          const parent = commentsMap.get(comment.parentCommentId);
          if (parent) {
            parent.replies!.push(commentWithReplies);
          }
        } else {
          topLevelComments.push(commentWithReplies);
        }
      });

      console.log("Organized top-level comments:", topLevelComments);
      setComments(topLevelComments);
    } catch (error) {
      console.error("Error loading comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!session?.user?.token || !newComment.trim()) return;

    try {
      setSubmitting(true);
      const request = {
        postId,
        content: newComment.trim(),
        userToken: session.user.token,
      } as CreateCommentRequest;

      await createComment(request);
      setNewComment("");
      toast.success("Comment posted");
      loadComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!session?.user?.token || !replyText.trim()) return;

    try {
      setSubmitting(true);

      const request = {
        postId,
        content: replyText.trim(),
        userToken: session.user.token,
        parentCommentId,
      } as CreateCommentRequest;

      await createComment(request);
      setReplyText("");
      setReplyingTo(null);
      toast.success("Reply posted");
      loadComments();
    } catch (error) {
      console.error("Error posting reply:", error);
      toast.error("Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!session?.user?.token || !editText.trim()) return;

    try {
      const request = {
        commentId,
        content: editText.trim(),
        userToken: session.user.token,
      } as UpdateCommentRequest;

      await updateComment(request);
      setEditText("");
      setEditingComment(null);
      toast.success("Comment updated");
      loadComments();
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!session?.user?.token) return;

    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const request = {
        commentId,
        userToken: session.user.token,
      } as DeleteCommentRequest;

      await deleteComment(request);
      toast.success("Comment deleted");
      loadComments();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderComment = (comment: CommentWithReplies, depth = 0) => {
    const isOwner = session?.user?.id === comment.userId;
    const canDelete = isOwner || [1, 2, 3].includes(session?.user?.role || 0); // Admin or Teacher

    return (
      <div key={comment.id} className={`${depth > 0 ? "ml-8 mt-4" : ""}`}>
        <Card className={depth > 0 ? "border-l-2 border-blue-200" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{comment.userName}</span>
                  <span>•</span>
                  <span>{formatDate(comment.createdAt)}</span>
                  {comment.createdAt !== comment.updatedAt && (
                    <>
                      <span>•</span>
                      <span className="italic">edited</span>
                    </>
                  )}
                </div>

                {editingComment === comment.id ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Edit comment (Markdown supported)
                    </p>
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      placeholder="Edit your comment... (Markdown supported)"
                      className="resize-none h-24 overflow-y-auto whitespace-pre-wrap break-words"
                      style={{ minHeight: "6rem", maxHeight: "6rem" }}
                    />
                    {editText && (
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Preview
                        </Label>
                        <div
                          className="border rounded-md p-3 bg-gray-50 max-h-24 overflow-y-auto overflow-x-hidden w-full min-w-0"
                          style={{
                            wordBreak: "break-word",
                            overflowWrap: "anywhere",
                            hyphens: "auto",
                          }}
                        >
                          <Markdown
                            content={editText}
                            className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleEditComment(comment.id)}
                        disabled={!editText.trim()}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingComment(null);
                          setEditText("");
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    <Markdown
                      content={comment.content}
                      className="prose-sm prose-gray max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_blockquote]:mb-2 [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-2 [&_h4]:mb-2 [&_h5]:mb-1 [&_h6]:mb-1"
                    />
                  </div>
                )}
              </div>

              {!editingComment && (
                <div className="flex gap-1 ml-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      // For top-level comments, reply directly
                      // For replies, mention the user but reply to the top-level comment
                      if (depth === 0) {
                        setReplyingTo(comment.id);
                        setReplyText("");
                      } else {
                        // Find the top-level parent comment ID from the comments tree
                        const topLevelParentId = comment.parentCommentId;
                        setReplyingTo(topLevelParentId || comment.id);
                        setReplyText(`@${comment.userName} `);
                      }
                    }}
                  >
                    <Reply className="h-3 w-3" />
                  </Button>
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditText(comment.content);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Reply form - only show for the comment being replied to */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-2">
                <Label>
                  {depth === 0
                    ? "Reply to comment"
                    : `Reply to ${comment.userName}`}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Markdown syntax supported for formatting
                </p>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply... (Markdown supported)"
                  className="resize-none h-24 overflow-y-auto whitespace-pre-wrap break-words"
                  style={{ minHeight: "6rem", maxHeight: "6rem" }}
                />
                {replyText && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      Preview
                    </Label>
                    <div
                      className="border rounded-md p-3 bg-gray-50 max-h-24 overflow-y-auto overflow-x-hidden w-full min-w-0"
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        hyphens: "auto",
                      }}
                    >
                      <Markdown
                        content={replyText}
                        className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
                      />
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? "Publishing..." : "Publish Reply"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Render replies - only for top-level comments (depth 0) */}
        {depth === 0 && comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map((reply) => renderComment(reply, 1))}
          </div>
        )}
      </div>
    );
  };

  if (!session?.user?.token) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please sign in to view and post comments.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New comment form */}
      <div className="space-y-2">
        <Label htmlFor="new-comment">Add a Comment</Label>
        <p className="text-xs text-muted-foreground">
          You can use Markdown syntax for formatting (e.g., **bold**, *italic*, `code`,
          etc.)
        </p>
        <Textarea
          id="new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts... (Markdown supported)"
          className="resize-none h-32 overflow-y-auto whitespace-pre-wrap break-words"
          style={{ minHeight: "8rem", maxHeight: "8rem" }}
        />
        {newComment && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Preview</Label>
            <div
              className="border rounded-md p-3 bg-gray-50 max-h-32 overflow-y-auto overflow-x-hidden w-full min-w-0"
              style={{
                wordBreak: "break-word",
                overflowWrap: "anywhere",
                hyphens: "auto",
              }}
            >
              <Markdown
                content={newComment}
                className="prose-sm prose-gray max-w-none whitespace-pre-wrap break-words overflow-x-hidden w-full min-w-0"
              />
            </div>
          </div>
        )}
        <Button
          onClick={handleSubmitComment}
          disabled={submitting || !newComment.trim()}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          {submitting ? "Publishing..." : "Publish Comment"}
        </Button>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => renderComment(comment))}
        </div>
      )}
    </div>
  );
}
