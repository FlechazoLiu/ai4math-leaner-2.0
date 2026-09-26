import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Comment
from typing import Optional


class CommentService(leaner_pb2_grpc.CommentServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_comment_to_proto(self, comment: Comment) -> leaner_pb2.Comment:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            comment.createdAt.replace(tzinfo=None)
            if comment.createdAt.tzinfo
            else comment.createdAt
        )
        updated_at_local = (
            comment.updatedAt.replace(tzinfo=None)
            if comment.updatedAt.tzinfo
            else comment.updatedAt
        )

        return leaner_pb2.Comment(
            id=comment.id,
            post_id=comment.postId,
            user_id=comment.userId,
            user_name=comment.user.username,
            content=comment.content,
            parent_comment_id=comment.parentCommentId or "",
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
        )

    async def CreateComment(
        self,
        request: leaner_pb2.CreateCommentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateCommentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify post exists
        post = await self.prisma.post.find_unique(where={"id": request.post_id})
        if not post:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Post not found")

        # Verify parent comment exists if provided
        parent_comment_id = None
        if request.HasField("parent_comment_id"):
            parent_comment = await self.prisma.comment.find_unique(
                where={"id": request.parent_comment_id}
            )
            if not parent_comment:
                await context.abort(
                    grpc.StatusCode.NOT_FOUND, "Parent comment not found"
                )
            if parent_comment.postId != request.post_id:
                await context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    "Parent comment must belong to the same post",
                )

            # Enforce two-level structure: if parent has a parent, use the grandparent instead
            if parent_comment.parentCommentId:
                parent_comment_id = parent_comment.parentCommentId
            else:
                parent_comment_id = request.parent_comment_id

        # Create the comment
        comment = await self.prisma.comment.create(
            data={
                "postId": request.post_id,
                "userId": user.id,
                "content": request.content,
                "parentCommentId": parent_comment_id,
            },
            include={"user": True},
        )

        return leaner_pb2.CreateCommentResponse(
            comment=self._convert_comment_to_proto(comment)
        )

    async def UpdateComment(
        self,
        request: leaner_pb2.UpdateCommentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateCommentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify comment exists
        comment = await self.prisma.comment.find_unique(
            where={"id": request.comment_id}, include={"user": True}
        )
        if not comment:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Comment not found")

        # Check if user is the author
        if comment.userId != user.id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author can update this comment",
            )

        # Update the comment
        updated_comment = await self.prisma.comment.update(
            where={"id": request.comment_id},
            data={"content": request.content},
            include={"user": True},
        )

        return leaner_pb2.UpdateCommentResponse(
            comment=self._convert_comment_to_proto(updated_comment)
        )

    async def DeleteComment(
        self,
        request: leaner_pb2.DeleteCommentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteCommentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify comment exists
        comment = await self.prisma.comment.find_unique(
            where={"id": request.comment_id}, include={"user": True}
        )
        if not comment:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Comment not found")

        # Check if user is the author or admin
        if comment.userId != user.id and user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author, admin, or teacher can delete this comment",
            )

        # Delete all replies first
        await self.prisma.comment.delete_many(
            where={"parentCommentId": request.comment_id}
        )

        # Delete the comment
        await self.prisma.comment.delete(where={"id": request.comment_id})

        return leaner_pb2.DeleteCommentResponse()

    async def ListComments(
        self, request: leaner_pb2.ListCommentsRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.ListCommentsResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify post exists
        post = await self.prisma.post.find_unique(where={"id": request.post_id})
        if not post:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Post not found")

        # Build where clause
        where_clause = {"postId": request.post_id}

        # Filter by parent comment if specified
        if request.HasField("parent_comment_id"):
            where_clause["parentCommentId"] = request.parent_comment_id
        else:
            # If no parent specified, get top-level comments only
            where_clause["parentCommentId"] = None

        # Get total count
        total_count = await self.prisma.comment.count(where=where_clause)

        # If page_token is "0", return all data without chunking
        if request.page_token == "0":
            comments = await self.prisma.comment.find_many(
                where=where_clause,
                order={"createdAt": "asc"},
                include={"user": True},
            )

            return leaner_pb2.ListCommentsResponse(
                comments=[self._convert_comment_to_proto(c) for c in comments],
                total_count=total_count,
                next_page_token="",
            )

        # Get paginated comments
        comments = await self.prisma.comment.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "asc"},
            include={"user": True},
        )

        return leaner_pb2.ListCommentsResponse(
            comments=[self._convert_comment_to_proto(c) for c in comments],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(comments) == request.page_size
            else "",
        )
