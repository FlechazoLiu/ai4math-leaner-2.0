import asyncio
from concurrent import futures
import grpc
from leaner_be.services.user_service import UserService
from leaner_be.services.question_service import QuestionService
from leaner_be.services.answer_service import AnswerService
from leaner_be.services.tag_service import TagService
from leaner_be.services.comment_service import CommentService
from leaner_be.services.build_leancode_service import BuildLeanCodeService
from leaner_be.services.course_service import CourseService
from leaner_be.services.assignment_service import AssignmentService
from leaner_be.services.assignment_answer_service import AssignmentAnswerService
from leaner_be.services.post_service import PostService
from leaner_be.services.notification_service import NotificationService
from leaner_be.services.resource_service import ResourceService
from leaner.v1.leaner_pb2_grpc import add_UserServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_QuestionServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_AnswerServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_TagServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_CommentServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_CourseServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_AssignmentServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_AssignmentAnswerServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_PostServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_NotificationServiceServicer_to_server
from leaner.v1.leaner_pb2_grpc import add_ResourceServiceServicer_to_server

import logging

# Set up logging
logging.basicConfig(
    level=logging.WARNING, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Set specific loggers to INFO level for our services
logging.getLogger("leaner_be").setLevel(logging.DEBUG)

# Reduce noise from external libraries
logging.getLogger("grpc").setLevel(logging.WARNING)
logging.getLogger("prisma").setLevel(logging.WARNING)
logging.getLogger("aiohttp").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)


async def main():
    # Start a user service instance first for prisma connections
    user_service = UserService()
    # Instantiate other services
    question_service = QuestionService()
    answer_service = AnswerService()
    tag_service = TagService()
    comment_service = CommentService()
    build_leancode_service = BuildLeanCodeService()
    course_service = CourseService()
    assignment_service = AssignmentService()
    assignment_answer_service = AssignmentAnswerService()
    post_service = PostService()
    notification_service = NotificationService()
    resource_service = ResourceService()

    # Connect prisma (use one client for all services)
    prisma_client = user_service.prisma  # or initialize a new Prisma() and pass it
    question_service.prisma = prisma_client
    answer_service.prisma = prisma_client
    tag_service.prisma = prisma_client
    comment_service.prisma = prisma_client
    build_leancode_service.prisma = prisma_client
    course_service.prisma = prisma_client
    assignment_service.prisma = prisma_client
    assignment_answer_service.prisma = prisma_client
    post_service.prisma = prisma_client
    notification_service.prisma = prisma_client
    resource_service.prisma = prisma_client

    try:
        await prisma_client.connect()
        logger.info("Successfully connected to database")
    except Exception as e:
        logger.error(f"Failed to connect to database: {str(e)}")
        raise

    # Create a gRPC server
    server = grpc.aio.server(futures.ThreadPoolExecutor(max_workers=10))

    add_UserServiceServicer_to_server(user_service, server)
    add_QuestionServiceServicer_to_server(question_service, server)
    add_AnswerServiceServicer_to_server(answer_service, server)
    add_TagServiceServicer_to_server(tag_service, server)
    add_CommentServiceServicer_to_server(comment_service, server)
    add_CourseServiceServicer_to_server(course_service, server)
    add_AssignmentServiceServicer_to_server(assignment_service, server)
    add_AssignmentAnswerServiceServicer_to_server(assignment_answer_service, server)
    add_PostServiceServicer_to_server(post_service, server)
    add_NotificationServiceServicer_to_server(notification_service, server)
    add_ResourceServiceServicer_to_server(resource_service, server)

    # Listen on port 7720
    server.add_insecure_port("[::]:7720")

    # Start the server
    await asyncio.gather(server.start(), build_leancode_service.run())
    # await server.start()
    print("gRPC Server started on port 7720")

    # Keep the servers running
    try:
        await server.wait_for_termination()
    except KeyboardInterrupt:
        await server.stop(0)
        await prisma_client.disconnect()  # Disconnect the shared client


if __name__ == "__main__":
    asyncio.run(main())
