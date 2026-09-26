import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Notification
from typing import Optional


class NotificationService(leaner_pb2_grpc.NotificationServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_notification_to_proto(
        self, notification: Notification
    ) -> leaner_pb2.Notification:
        return leaner_pb2.Notification(
            id=notification.id,
            title=notification.title,
            message=notification.message,
            user_id=notification.userId,
            user_name=notification.user.username,
            course_id=notification.courseId,
            created_at=notification.createdAt.isoformat() if notification.createdAt else "",
            updated_at=notification.updatedAt.isoformat() if notification.updatedAt else "",
        )

    async def CreateNotification(
        self,
        request: leaner_pb2.CreateNotificationRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateNotificationResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can create notifications",
                )

        # Create the notification
        notification = await self.prisma.notification.create(
            data={
                "title": request.title,
                "message": request.message,
                "userId": user.id,
                "courseId": request.course_id,
            },
            include={"user": True},
        )

        return leaner_pb2.CreateNotificationResponse(
            notification=self._convert_notification_to_proto(notification)
        )

    async def UpdateNotification(
        self,
        request: leaner_pb2.UpdateNotificationRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateNotificationResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify notification exists
        notification = await self.prisma.notification.find_unique(
            where={"id": request.notification_id}, include={"user": True}
        )
        if not notification:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Notification not found")

        # Check permissions (author, admin, or teacher/assistant of course)
        if notification.userId != user.id and user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": notification.courseId}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": notification.courseId}
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only the author, admin, course teachers, and assistants can update notifications",
                )

        # Build update data
        update_data = {}
        if request.HasField("title"):
            update_data["title"] = request.title
        if request.HasField("message"):
            update_data["message"] = request.message
        if request.HasField("course_id"):
            # Verify new course exists
            course = await self.prisma.course.find_unique(
                where={"id": request.course_id}
            )
            if not course:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")
            update_data["courseId"] = request.course_id

        # Update the notification
        updated_notification = await self.prisma.notification.update(
            where={"id": request.notification_id},
            data=update_data,
            include={"user": True},
        )

        return leaner_pb2.UpdateNotificationResponse(
            notification=self._convert_notification_to_proto(updated_notification)
        )

    async def DeleteNotification(
        self,
        request: leaner_pb2.DeleteNotificationRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteNotificationResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify notification exists
        notification = await self.prisma.notification.find_unique(
            where={"id": request.notification_id}, include={"user": True}
        )
        if not notification:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Notification not found")

        # Check permissions (author, admin, or teacher of course)
        if notification.userId != user.id and user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": notification.courseId}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only the author, admin, or course teachers can delete notifications",
                )

        # Delete the notification
        await self.prisma.notification.delete(where={"id": request.notification_id})

        return leaner_pb2.DeleteNotificationResponse()

    async def ListNotifications(
        self,
        request: leaner_pb2.ListNotificationsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListNotificationsResponse:
        if not request.HasField("user_token"):
            await context.abort(
                grpc.StatusCode.UNAUTHENTICATED, "User token is required"
            )

        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        if not request.HasField("course_id"):
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "course_id is required when listing notifications",
            )

        where_clause = {"courseId": request.course_id}

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Only course participants (or admin) can list notifications
        if user.role != "ADMIN":
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            enrollment = await self.prisma.courseenrollment.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not assistant and not enrollment:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only course participants can list notifications",
                )

        page_size = request.page_size if request.page_size > 0 else 50

        # Get total count
        total_count = await self.prisma.notification.count(where=where_clause)

        # Get paginated notifications
        notifications = await self.prisma.notification.find_many(
            where=where_clause,
            skip=page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=page_size,
            order={"createdAt": "desc"},
            include={"user": True},
        )

        return leaner_pb2.ListNotificationsResponse(
            notifications=[
                self._convert_notification_to_proto(n) for n in notifications
            ],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(notifications) == page_size
            else "",
        )
