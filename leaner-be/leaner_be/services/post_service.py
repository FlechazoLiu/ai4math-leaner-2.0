import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from typing import Optional
from prisma.models import Post


class PostService(leaner_pb2_grpc.PostServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_post_to_proto(self, post: Post) -> leaner_pb2.Post:
        return leaner_pb2.Post(
            id=post.id,
            title=post.title,
            content=post.content,
            user_id=post.userId,
            user_name=post.user.username,
            course_id=post.courseId,
            is_draft=post.isDraft,
            created_at=post.createdAt.isoformat() if post.createdAt else "",
            updated_at=post.updatedAt.isoformat() if post.updatedAt else "",
        )

    async def CreatePost(
        self,
        request: leaner_pb2.CreatePostRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreatePostResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Check user permissions (must be enrolled, teaching, or admin)
        if user.role not in ["ADMIN", "TEACHER"]:
            # Check if user is enrolled or assistant in the course
            enrollment = await self.prisma.courseenrollment.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not enrollment and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "User must be enrolled in or teaching the course to create posts",
                )

        # Create the post
        post = await self.prisma.post.create(
            data={
                "title": request.title,
                "content": request.content,
                "userId": user.id,
                "courseId": request.course_id,
                "isDraft": request.is_draft if request.HasField("is_draft") else False,
            },
            include={"user": True},
        )

        return leaner_pb2.CreatePostResponse(post=self._convert_post_to_proto(post))

    async def UpdatePost(
        self,
        request: leaner_pb2.UpdatePostRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdatePostResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify post exists
        post = await self.prisma.post.find_unique(
            where={"id": request.post_id}, include={"user": True}
        )
        if not post:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Post not found")

        # Check if user is the author or admin
        if post.userId != user.id and user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author, admin, or teacher can update this post",
            )

        # Build update data
        update_data = {}
        if request.HasField("title"):
            update_data["title"] = request.title
        if request.HasField("content"):
            update_data["content"] = request.content
        if request.HasField("is_draft"):
            update_data["isDraft"] = request.is_draft

        # Update the post
        updated_post = await self.prisma.post.update(
            where={"id": request.post_id},
            data=update_data,
            include={"user": True},
        )

        return leaner_pb2.UpdatePostResponse(
            post=self._convert_post_to_proto(updated_post)
        )

    async def DeletePost(
        self,
        request: leaner_pb2.DeletePostRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeletePostResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify post exists
        post = await self.prisma.post.find_unique(
            where={"id": request.post_id}, include={"user": True}
        )
        if not post:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Post not found")

        # Check if user is the author or admin
        if post.userId != user.id and user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author, admin, or teacher can delete this post",
            )

        # Delete all comments first
        await self.prisma.comment.delete_many(where={"postId": request.post_id})

        # Delete the post
        await self.prisma.post.delete(where={"id": request.post_id})

        return leaner_pb2.DeletePostResponse()

    async def ListPosts(
        self, request: leaner_pb2.ListPostsRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.ListPostsResponse:
        # Build where clause
        where_clause = {}

        # Filter by course if specified
        if request.HasField("course_id"):
            where_clause["courseId"] = request.course_id

        # If user token provided, check permissions for private posts
        user = None
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )

        # Handle draft post visibility
        if user:
            if user.role == "ADMIN":
                # Admins can see all posts (including drafts)
                pass  # No filtering needed
            else:
                # Non-admin users can only see published posts and their own drafts
                # We need to use OR condition: (isDraft = false) OR (isDraft = true AND userId = user.id)
                # This is complex with Prisma, so we'll handle it differently
                pass  # We'll filter after fetching
        else:
            # Unauthenticated users can only see published posts
            where_clause["isDraft"] = False

        # Get all posts first (we'll filter after fetching for non-admin users)
        all_posts = await self.prisma.post.find_many(
            where=where_clause,
            order={"createdAt": "desc"},
            include={"user": True},
        )

        # Filter posts based on user permissions
        filtered_posts = []
        if user and user.role == "ADMIN":
            # Admins can see all posts
            filtered_posts = all_posts
        elif user:
            # Non-admin users can see published posts and their own drafts
            filtered_posts = [
                post for post in all_posts if not post.isDraft or post.userId == user.id
            ]
        else:
            # Unauthenticated users can only see published posts
            filtered_posts = [post for post in all_posts if not post.isDraft]

        # Apply pagination to filtered results
        total_count = len(filtered_posts)
        start_index = (
            request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0
        )
        end_index = start_index + request.page_size
        paginated_posts = filtered_posts[start_index:end_index]

        return leaner_pb2.ListPostsResponse(
            posts=[self._convert_post_to_proto(p) for p in paginated_posts],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(paginated_posts) == request.page_size
            else "",
        )

    async def GetPost(
        self,
        request: leaner_pb2.GetPostRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetPostResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify post exists
        post = await self.prisma.post.find_unique(
            where={"id": request.post_id}, include={"user": True}
        )
        if not post:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Post not found")

        # Check if user can see draft posts
        if post.isDraft:
            # Only author and admins can see draft posts
            if user.id != post.userId and user.role != "ADMIN":
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Post is draft and user does not have permission to view it",
                )

        return leaner_pb2.GetPostResponse(post=self._convert_post_to_proto(post))
