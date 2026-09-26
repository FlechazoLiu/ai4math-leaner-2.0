import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Course, EnrollmentRequest
from prisma.enums import EnrollmentRequestStatus
from typing import Optional


class CourseService(leaner_pb2_grpc.CourseServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    async def _is_assistant_for_course(self, user_id: str, course_id: str) -> bool:
        """Check if a user is an assistant for a specific course."""
        assistant = await self.prisma.courseassistant.find_first(
            where={"userId": user_id, "courseId": course_id}
        )
        return assistant is not None

    async def _convert_course_to_proto(self, course: Course) -> leaner_pb2.Course:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            course.createdAt.replace(tzinfo=None)
            if course.createdAt.tzinfo
            else course.createdAt
        )
        updated_at_local = (
            course.updatedAt.replace(tzinfo=None)
            if course.updatedAt.tzinfo
            else course.updatedAt
        )

        # Get instructor names from CourseTeaching table (exclude admins)
        course_teachings = await self.prisma.courseteaching.find_many(
            where={"courseId": course.id}, include={"user": True}
        )
        instructor_names = [
            teaching.user.displayName or teaching.user.username
            for teaching in course_teachings
            if teaching.user.role != "ADMIN"
        ]

        return leaner_pb2.Course(
            id=course.id,
            title=course.title,
            description=course.description,
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
            instructor_names=instructor_names,
        )

    def _convert_enrollment_request_to_proto(
        self, enrollment_request: EnrollmentRequest
    ) -> leaner_pb2.EnrollmentRequest:
        created_at_local = (
            enrollment_request.createdAt.replace(tzinfo=None)
            if enrollment_request.createdAt.tzinfo
            else enrollment_request.createdAt
        )
        updated_at_local = (
            enrollment_request.updatedAt.replace(tzinfo=None)
            if enrollment_request.updatedAt.tzinfo
            else enrollment_request.updatedAt
        )

        if enrollment_request.status == EnrollmentRequestStatus.PENDING:
            status = (
                leaner_pb2.EnrollmentRequestStatus.ENROLLMENT_REQUEST_STATUS_PENDING
            )
        elif enrollment_request.status == EnrollmentRequestStatus.APPROVED:
            status = (
                leaner_pb2.EnrollmentRequestStatus.ENROLLMENT_REQUEST_STATUS_APPROVED
            )
        elif enrollment_request.status == EnrollmentRequestStatus.REJECTED:
            status = (
                leaner_pb2.EnrollmentRequestStatus.ENROLLMENT_REQUEST_STATUS_REJECTED
            )

        return leaner_pb2.EnrollmentRequest(
            id=enrollment_request.id,
            user_id=enrollment_request.userId,
            user_name=enrollment_request.user.username,
            course_id=enrollment_request.courseId,
            course_name=enrollment_request.course.title,
            message=enrollment_request.message,
            status=status,
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
        )

    async def CreateCourse(
        self,
        request: leaner_pb2.CreateCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check if user has permission to create courses (admin or teacher)
        if user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only admins and teachers can create courses",
            )

        # Create the course
        course = await self.prisma.course.create(
            data={
                "title": request.title,
                "description": request.description,
            }
        )

        # If user is a teacher or admin, assign them to teach the course
        if user.role in ["TEACHER", "ADMIN"]:
            await self.prisma.courseteaching.create(
                data={
                    "userId": user.id,
                    "courseId": course.id,
                }
            )

        return leaner_pb2.CreateCourseResponse(
            course=await self._convert_course_to_proto(course)
        )

    async def UpdateCourse(
        self,
        request: leaner_pb2.UpdateCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateCourseResponse:
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
            is_assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not is_assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, assigned teachers, and assistants can update this course",
                )

        # Build update data
        update_data = {}
        if request.HasField("title"):
            update_data["title"] = request.title
        if request.HasField("description"):
            update_data["description"] = request.description

        # Update the course
        updated_course = await self.prisma.course.update(
            where={"id": request.course_id},
            data=update_data,
        )

        return leaner_pb2.UpdateCourseResponse(
            course=await self._convert_course_to_proto(updated_course)
        )

    async def DeleteCourse(
        self,
        request: leaner_pb2.DeleteCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check if user has permission to delete courses (admin only)
        if user.role != "ADMIN":
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only admins can delete courses",
            )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Delete all related data first
        await self.prisma.courseenrollment.delete_many(
            where={"courseId": request.course_id}
        )
        await self.prisma.courseteaching.delete_many(
            where={"courseId": request.course_id}
        )
        await self.prisma.courseassistant.delete_many(
            where={"courseId": request.course_id}
        )
        await self.prisma.notification.delete_many(
            where={"courseId": request.course_id}
        )

        # Delete posts and their comments
        posts = await self.prisma.post.find_many(where={"courseId": request.course_id})
        for post in posts:
            await self.prisma.comment.delete_many(where={"postId": post.id})
        await self.prisma.post.delete_many(where={"courseId": request.course_id})

        # Delete assignments and related data
        assignments = await self.prisma.assignment.find_many(
            where={"courseId": request.course_id}
        )
        for assignment in assignments:
            questions = await self.prisma.assignmentquestion.find_many(
                where={"assignmentId": assignment.id}
            )
            for question in questions:
                answers = await self.prisma.assignmentanswer.find_many(
                    where={"assignmentQuestionId": question.id}
                )
                for answer in answers:
                    await self.prisma.assignmentgrade.delete_many(
                        where={"assignmentAnswerId": answer.id}
                    )
                await self.prisma.assignmentanswer.delete_many(
                    where={"assignmentQuestionId": question.id}
                )
            await self.prisma.assignmentquestion.delete_many(
                where={"assignmentId": assignment.id}
            )
        await self.prisma.assignment.delete_many(where={"courseId": request.course_id})

        # Delete assignment questions not in any assignment
        await self.prisma.assignmentquestion.delete_many(
            where={"courseId": request.course_id, "assignmentId": None}
        )

        # Delete enrollment requests
        await self.prisma.enrollmentrequest.delete_many(
            where={"courseId": request.course_id}
        )
        # Delete the course
        await self.prisma.course.delete(where={"id": request.course_id})

        return leaner_pb2.DeleteCourseResponse()

    async def ListCourses(
        self, request: leaner_pb2.ListCoursesRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.ListCoursesResponse:
        # Build where clause
        where_clause = {}

        # If user token provided, we can filter by user's courses
        user = None
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )

        # Filter by enrollment or teaching status if user is provided
        if user and request.user_token:
            if request.is_teaching:
                # Filter for courses the user is teaching
                # Admins see all courses, teachers see only their assigned courses
                if user.role == "ADMIN":
                    # Admin sees all courses when filtering by "teaching"
                    pass  # No additional filter needed
                else:
                    # Teachers/assistants see only courses they're assigned to
                    where_clause["OR"] = [
                        {"CourseTeaching": {"some": {"userId": user.id}}},
                        {"CourseAssistant": {"some": {"userId": user.id}}},
                    ]
            elif request.is_enrolled:
                # Filter for courses the user is enrolled in
                where_clause["CourseEnrollment"] = {"some": {"userId": user.id}}
            else:
                # Filter for courses the user is NOT enrolled in
                where_clause["CourseEnrollment"] = {"none": {"userId": user.id}}

        # Get total count
        total_count = await self.prisma.course.count(where=where_clause)

        # Get paginated courses
        courses = await self.prisma.course.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
        )

        # Convert courses to proto with instructor information
        proto_courses = []
        for course in courses:
            proto_course = await self._convert_course_to_proto(course)
            proto_courses.append(proto_course)

        return leaner_pb2.ListCoursesResponse(
            courses=proto_courses,
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(courses) == request.page_size
            else "",
        )

    async def GetCourse(
        self,
        request: leaner_pb2.GetCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        return leaner_pb2.GetCourseResponse(
            course=await self._convert_course_to_proto(course)
        )

    async def CheckEnrollment(
        self,
        request: leaner_pb2.CheckEnrollmentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CheckEnrollmentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Check if user is enrolled, teaching, or assisting
        existing = await self.prisma.courseenrollment.find_first(
            where={"userId": user.id, "courseId": request.course_id}
        )
        if existing:
            return leaner_pb2.CheckEnrollmentResponse(is_enrolled=True)

        # Also check if user is teaching or assisting this course
        teaching = await self.prisma.courseteaching.find_first(
            where={"userId": user.id, "courseId": request.course_id}
        )
        if teaching:
            return leaner_pb2.CheckEnrollmentResponse(is_enrolled=True)

        assistant = await self.prisma.courseassistant.find_first(
            where={"userId": user.id, "courseId": request.course_id}
        )
        if assistant:
            return leaner_pb2.CheckEnrollmentResponse(is_enrolled=True)

        return leaner_pb2.CheckEnrollmentResponse(is_enrolled=False)

    async def RequestToEnrollInCourse(
        self,
        request: leaner_pb2.RequestToEnrollInCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RequestToEnrollInCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (self enrollment)
        if user.id != request.user_id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the user themselves can request to enroll in courses",
            )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Check if already enrolled
        existing = await self.prisma.courseenrollment.find_first(
            where={"userId": request.user_id, "courseId": request.course_id}
        )
        if existing:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS, "User already enrolled in course"
            )

        # Check if already has an enrollment request
        existing_request = await self.prisma.enrollmentrequest.find_first(
            where={"userId": request.user_id, "courseId": request.course_id}
        )
        if existing_request:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS,
                "User already has an enrollment request for this course",
            )

        # Create enrollment request
        await self.prisma.enrollmentrequest.create(
            data={
                "userId": request.user_id,
                "courseId": request.course_id,
                "message": request.message,
            }
        )

        return leaner_pb2.RequestToEnrollInCourseResponse()

    async def RemoveEnrollmentRequest(
        self,
        request: leaner_pb2.RemoveEnrollmentRequestRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RemoveEnrollmentRequestResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify enrollment request exists
        enrollment_request = await self.prisma.enrollmentrequest.find_unique(
            where={"id": request.enrollment_request_id},
            include={"course": True},
        )
        if not enrollment_request:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Enrollment request not found"
            )

        # Permission rules:
        # - request owner can remove
        # - admin can remove
        # - teacher of the course can remove
        is_owner = enrollment_request.userId == user.id
        is_admin = user.role == "ADMIN"
        is_teacher_of_course = False
        if not is_owner and not is_admin:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": enrollment_request.courseId}
            )
            is_teacher_of_course = teaching is not None

        if not (is_owner or is_admin or is_teacher_of_course):
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the request owner, admins, or course teachers can remove enrollment requests",
            )

        # Remove enrollment request
        await self.prisma.enrollmentrequest.delete(
            where={"id": request.enrollment_request_id}
        )

        return leaner_pb2.RemoveEnrollmentRequestResponse()

    async def ListEnrollmentRequests(
        self,
        request: leaner_pb2.ListEnrollmentRequestsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListEnrollmentRequestsResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        enrollment_requests = []
        if request.course_id:
            # Course-level listing: admin or teacher of the course
            if user.role != "ADMIN":
                teaching = await self.prisma.courseteaching.find_first(
                    where={"userId": user.id, "courseId": request.course_id}
                )
                if not teaching:
                    await context.abort(
                        grpc.StatusCode.PERMISSION_DENIED,
                        "Only admins and course teachers can list course enrollment requests",
                    )

            enrollment_requests = await self.prisma.enrollmentrequest.find_many(
                where={
                    "courseId": request.course_id,
                    "status": EnrollmentRequestStatus.PENDING,
                },
                include={"user": True, "course": True},
                order={"createdAt": "desc"},
            )
        else:
            # User-level listing: current user can view their own requests
            enrollment_requests = await self.prisma.enrollmentrequest.find_many(
                where={"userId": user.id},
                include={"user": True, "course": True},
                order={"createdAt": "desc"},
            )

        return leaner_pb2.ListEnrollmentRequestsResponse(
            enrollment_requests=[
                self._convert_enrollment_request_to_proto(e)
                for e in enrollment_requests
            ]
        )

    async def UpdateEnrollmentRequestStatus(
        self,
        request: leaner_pb2.UpdateEnrollmentRequestStatusRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateEnrollmentRequestStatusResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin, teacher)
        if user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only admins and teachers can update enrollment request status",
            )

        # Verify enrollment request exists
        enrollment_request = await self.prisma.enrollmentrequest.find_unique(
            where={"id": request.enrollment_request_id}
        )
        if not enrollment_request:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Enrollment request not found"
            )

        # Non-admin teachers can only update requests for courses they teach
        if user.role != "ADMIN":
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": enrollment_request.courseId}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only course teachers can update enrollment requests for their courses",
                )

        # Map status to EnrollmentRequestStatus
        status = EnrollmentRequestStatus.PENDING
        if (
            request.status
            == leaner_pb2.EnrollmentRequestStatus.ENROLLMENT_REQUEST_STATUS_APPROVED
        ):
            status = EnrollmentRequestStatus.APPROVED

        elif (
            request.status
            == leaner_pb2.EnrollmentRequestStatus.ENROLLMENT_REQUEST_STATUS_REJECTED
        ):
            status = EnrollmentRequestStatus.REJECTED

        # Update enrollment request status
        await self.prisma.enrollmentrequest.update(
            where={"id": request.enrollment_request_id}, data={"status": status}
        )

        return leaner_pb2.UpdateEnrollmentRequestStatusResponse()

    async def EnrollUserInCourse(
        self,
        request: leaner_pb2.EnrollUserInCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.EnrollUserInCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN", "TEACHER"]:
            if user.role == "ASSISTANT":
                if not await self._is_assistant_for_course(user.id, request.course_id):
                    await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not assigned as assistant to this course")
            else:
                await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Only admins, teachers, and assistants can enroll users in courses")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Find target user by id, studentId, username, or email
        target_user = await self.prisma.user.find_unique(where={"id": request.user_id})
        if not target_user:
            target_user = await self.prisma.user.find_unique(where={"studentId": request.user_id})
        if not target_user:
            target_user = await self.prisma.user.find_first(
                where={"OR": [{"username": request.user_id}, {"email": request.user_id}]}
            )
        if not target_user:
            await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")

        # Check if already enrolled
        existing = await self.prisma.courseenrollment.find_first(
            where={"userId": target_user.id, "courseId": request.course_id}
        )
        if existing:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS, "User already enrolled in course"
            )

        # Create enrollment
        await self.prisma.courseenrollment.create(
            data={
                "userId": target_user.id,
                "courseId": request.course_id,
            }
        )

        return leaner_pb2.EnrollUserInCourseResponse()

    async def RemoveUserFromCourse(
        self,
        request: leaner_pb2.RemoveUserFromCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RemoveUserFromCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin, teacher, assistant of course)
        if user.role not in ["ADMIN"]:
            # Check if user is teaching this course
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            is_assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not is_assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, or assistants can remove enrollment",
                )

        # Remove enrollment
        await self.prisma.courseenrollment.delete_many(
            where={"userId": request.user_id, "courseId": request.course_id}
        )

        return leaner_pb2.RemoveUserFromCourseResponse()

    async def AssignTeacherToCourse(
        self,
        request: leaner_pb2.AssignTeacherToCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.AssignTeacherToCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin only)
        if user.role != "ADMIN":
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only admins can assign teachers to courses",
            )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Find target user by id, username or email
        target_user = await self.prisma.user.find_first(
            where={"OR": [{"id": request.user_id}, {"username": request.user_id}, {"email": request.user_id}]}
        )
        if not target_user:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"User not found with username/email: {request.user_id}",
            )

        # Verify target user is a teacher
        if target_user.role != "TEACHER":
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                f"User '{request.user_id}' must be a teacher (current role: {target_user.role})",
            )

        # Check if already assigned
        existing = await self.prisma.courseteaching.find_first(
            where={"userId": target_user.id, "courseId": request.course_id}
        )
        if existing:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS,
                f"Teacher '{request.user_id}' is already assigned to this course",
            )

        # Create assignment
        await self.prisma.courseteaching.create(
            data={
                "userId": target_user.id,
                "courseId": request.course_id,
            }
        )

        return leaner_pb2.AssignTeacherToCourseResponse()

    async def RemoveTeacherFromCourse(
        self,
        request: leaner_pb2.RemoveTeacherFromCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RemoveTeacherFromCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin only)
        if user.role != "ADMIN":
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only admins can remove teacher assignments",
            )

        # Remove assignment
        await self.prisma.courseteaching.delete_many(
            where={"userId": request.user_id, "courseId": request.course_id}
        )

        return leaner_pb2.RemoveTeacherFromCourseResponse()

    async def AssignAssistantToCourse(
        self,
        request: leaner_pb2.AssignAssistantToCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.AssignAssistantToCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin or teacher of course)
        if user.role not in ["ADMIN"]:
            # Check if user is teaching this course
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins and course teachers can assign assistants",
                )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Find target user by id, username or email
        target_user = await self.prisma.user.find_first(
            where={"OR": [{"id": request.user_id}, {"username": request.user_id}, {"email": request.user_id}]}
        )
        if not target_user:
            await context.abort(
                grpc.StatusCode.NOT_FOUND,
                f"User not found with username/email: {request.user_id}",
            )

        # Check if already assigned
        existing = await self.prisma.courseassistant.find_first(
            where={"userId": target_user.id, "courseId": request.course_id}
        )
        if existing:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS,
                f"User '{request.user_id}' is already assigned as an assistant to this course",
            )

        # Make target user an assistant if they aren't already
        if target_user.role != "ASSISTANT":
            await self.prisma.user.update(
                where={"id": target_user.id}, data={"role": "ASSISTANT"}
            )

        # Create assignment
        await self.prisma.courseassistant.create(
            data={
                "userId": target_user.id,
                "courseId": request.course_id,
            }
        )

        return leaner_pb2.AssignAssistantToCourseResponse()

    async def RemoveAssistantFromCourse(
        self,
        request: leaner_pb2.RemoveAssistantFromCourseRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RemoveAssistantFromCourseResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin or teacher of course)
        if user.role not in ["ADMIN"]:
            # Check if user is teaching this course
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins and course teachers can remove assistant assignments",
                )

        # Remove assignment
        await self.prisma.courseassistant.delete_many(
            where={"userId": request.user_id, "courseId": request.course_id}
        )

        # Make target user a student
        await self.prisma.user.update(
            where={"id": request.user_id}, data={"role": "STUDENT"}
        )

        return leaner_pb2.RemoveAssistantFromCourseResponse()

    def _convert_user_to_proto(self, user) -> leaner_pb2.User:
        """Convert a Prisma User model to protobuf User message."""
        # Map role string to enum
        role_map = {
            "ADMIN": leaner_pb2.Role.ROLE_ADMIN,
            "TEACHER": leaner_pb2.Role.ROLE_TEACHER,
            "ASSISTANT": leaner_pb2.Role.ROLE_ASSISTANT,
            "STUDENT": leaner_pb2.Role.ROLE_STUDENT,
        }
        role = role_map.get(user.role, leaner_pb2.Role.ROLE_UNSPECIFIED)

        return leaner_pb2.User(
            id=user.id,
            email=user.email,
            username=user.username,
            role=role,
            student_id=user.studentId or "",
            display_name=user.displayName or "",
            must_change_password=user.mustChangePassword,
        )

    async def ListCourseStudents(
        self,
        request: leaner_pb2.ListCourseStudentsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListCourseStudentsResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN"]:
            # Check if user is teaching or assisting this course
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            assisting = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not assisting:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can list course students",
                )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Get total count of enrolled students
        total_count = await self.prisma.courseenrollment.count(
            where={"courseId": request.course_id}
        )

        # Get paginated enrolled students
        enrollments = await self.prisma.courseenrollment.find_many(
            where={"courseId": request.course_id},
            include={"user": True},
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size if request.page_size > 0 else 50,
            order={"userId": "desc"},
        )

        # Convert to proto users
        students = [
            self._convert_user_to_proto(enrollment.user) for enrollment in enrollments
        ]

        return leaner_pb2.ListCourseStudentsResponse(
            students=students,
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(enrollments) == request.page_size
            else "",
        )

    async def ListCourseAssistants(
        self,
        request: leaner_pb2.ListCourseAssistantsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListCourseAssistantsResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            is_assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": request.course_id}
            )
            if not teaching and not is_assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can list course assistants",
                )

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # Get total count of assigned assistants
        total_count = await self.prisma.courseassistant.count(
            where={"courseId": request.course_id}
        )

        # Get paginated assigned assistants
        assignments = await self.prisma.courseassistant.find_many(
            where={"courseId": request.course_id},
            include={"user": True},
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size if request.page_size > 0 else 50,
            order={"userId": "desc"},
        )

        # Convert to proto users
        assistants = [
            self._convert_user_to_proto(assignment.user) for assignment in assignments
        ]

        return leaner_pb2.ListCourseAssistantsResponse(
            assistants=assistants,
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(assignments) == request.page_size
            else "",
        )
