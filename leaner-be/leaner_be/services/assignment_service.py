import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Assignment, AssignmentQuestion
from typing import Optional


class AssignmentService(leaner_pb2_grpc.AssignmentServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_assignment_to_proto(
        self, assignment: Assignment
    ) -> leaner_pb2.Assignment:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            assignment.createdAt.replace(tzinfo=None)
            if assignment.createdAt.tzinfo
            else assignment.createdAt
        )
        updated_at_local = (
            assignment.updatedAt.replace(tzinfo=None)
            if assignment.updatedAt.tzinfo
            else assignment.updatedAt
        )

        return leaner_pb2.Assignment(
            id=assignment.id,
            course_id=assignment.courseId,
            title=assignment.title,
            description=assignment.description,
            is_draft=assignment.isDraft,
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
        )

    def _convert_assignment_question_to_proto(
        self, question: AssignmentQuestion
    ) -> leaner_pb2.AssignmentQuestion:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            question.createdAt.replace(tzinfo=None)
            if question.createdAt.tzinfo
            else question.createdAt
        )
        updated_at_local = (
            question.updatedAt.replace(tzinfo=None)
            if question.updatedAt.tzinfo
            else question.updatedAt
        )

        return leaner_pb2.AssignmentQuestion(
            id=question.id,
            course_id=question.courseId,
            title=question.title,
            informal_description=question.informalDescription,
            formal_description=question.formalDescription or "",
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
            assignment_id=question.assignmentId or "",
        )

    async def CreateAssignment(
        self,
        request: leaner_pb2.CreateAssignmentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateAssignmentResponse:
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
                    "Only admins, course teachers, and assistants can create assignments",
                )

        # Create the assignment
        assignment = await self.prisma.assignment.create(
            data={
                "courseId": request.course_id,
                "isDraft": request.is_draft,
                "title": request.title,
                "description": request.description,
            }
        )

        return leaner_pb2.CreateAssignmentResponse(
            assignment=self._convert_assignment_to_proto(assignment)
        )

    async def GetAssignment(
        self,
        request: leaner_pb2.GetAssignmentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetAssignmentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify assignment exists
        assignment = await self.prisma.assignment.find_unique(
            where={"id": request.assignment_id}
        )
        if not assignment:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment not found")

        # Check permissions (admin, teacher, assistant, or enrolled student)
        if user.role not in ["ADMIN"]:
            # Check if user is teacher or assistant
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )
            # Check if user is enrolled student
            enrollment = await self.prisma.courseenrollment.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )

            if not teaching and not assistant and not enrollment:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, assistants, and enrolled students can view assignments",
                )

        return leaner_pb2.GetAssignmentResponse(
            assignment=self._convert_assignment_to_proto(assignment)
        )

    async def UpdateAssignment(
        self,
        request: leaner_pb2.UpdateAssignmentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateAssignmentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify assignment exists
        assignment = await self.prisma.assignment.find_unique(
            where={"id": request.assignment_id}
        )
        if not assignment:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment not found")

        # Check permissions
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can update assignments",
                )
        update_data = {}
        if request.HasField("title"):
            update_data["title"] = request.title
        if request.HasField("description"):
            update_data["description"] = request.description
        if request.HasField("is_draft"):
            update_data["isDraft"] = request.is_draft

        updated_assignment = await self.prisma.assignment.update(
            where={"id": request.assignment_id},
            data=update_data,
        )

        return leaner_pb2.UpdateAssignmentResponse(
            assignment=self._convert_assignment_to_proto(updated_assignment)
        )

    async def DeleteAssignment(
        self,
        request: leaner_pb2.DeleteAssignmentRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteAssignmentResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify assignment exists
        assignment = await self.prisma.assignment.find_unique(
            where={"id": request.assignment_id}
        )
        if not assignment:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment not found")

        # Check permissions (admin or teacher of course only)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": assignment.courseId}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins and course teachers can delete assignments",
                )

        # Delete related data first
        questions = await self.prisma.assignmentquestion.find_many(
            where={"assignmentId": request.assignment_id}
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
            where={"assignmentId": request.assignment_id}
        )

        # Delete the assignment
        await self.prisma.assignment.delete(where={"id": request.assignment_id})

        return leaner_pb2.DeleteAssignmentResponse()

    async def ListAssignments(
        self,
        request: leaner_pb2.ListAssignmentsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListAssignmentsResponse:
        # Build where clause
        where_clause = {}

        # Filter by course if specified
        if request.HasField("course_id"):
            where_clause["courseId"] = request.course_id

        # If user token provided, check permissions
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )
            if not user:
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED, "Invalid user token"
                )

        # Get total count
        total_count = await self.prisma.assignment.count(where=where_clause)

        # Get paginated assignments
        assignments = await self.prisma.assignment.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
        )

        return leaner_pb2.ListAssignmentsResponse(
            assignments=[self._convert_assignment_to_proto(a) for a in assignments],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(assignments) == request.page_size
            else "",
        )

    async def CreateAssignmentQuestion(
        self,
        request: leaner_pb2.CreateAssignmentQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateAssignmentQuestionResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify course exists
        course = await self.prisma.course.find_unique(where={"id": request.course_id})
        if not course:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Course not found")

        # If assignment_id is provided, verify it exists and belongs to the course
        assignment_id = None
        if request.HasField("assignment_id"):
            assignment = await self.prisma.assignment.find_unique(
                where={"id": request.assignment_id}
            )
            if not assignment:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment not found")
            if assignment.courseId != request.course_id:
                await context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT,
                    "Assignment must belong to the specified course",
                )
            assignment_id = request.assignment_id

        # Check permissions
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
                    "Only admins, course teachers, and assistants can create assignment questions",
                )

        # Create the assignment question
        question = await self.prisma.assignmentquestion.create(
            data={
                "courseId": request.course_id,
                "title": request.title,
                "informalDescription": request.informal_description,
                "formalDescription": request.formal_description
                if request.HasField("formal_description")
                else None,
                "assignmentId": assignment_id,
            }
        )

        return leaner_pb2.CreateAssignmentQuestionResponse(
            question=self._convert_assignment_question_to_proto(question)
        )

    async def UpdateAssignmentQuestion(
        self,
        request: leaner_pb2.UpdateAssignmentQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateAssignmentQuestionResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify question exists
        question = await self.prisma.assignmentquestion.find_unique(
            where={"id": request.question_id}
        )
        if not question:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment question not found"
            )

        # Check permissions
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": question.courseId}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": question.courseId}
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can update assignment questions",
                )

        # Build update data
        update_data = {}
        if request.HasField("title"):
            update_data["title"] = request.title
        if request.HasField("informal_description"):
            update_data["informalDescription"] = request.informal_description
        if request.HasField("formal_description"):
            update_data["formalDescription"] = request.formal_description
        if request.HasField("assignment_id"):
            # Verify assignment exists and belongs to the same course
            if request.assignment_id:
                assignment = await self.prisma.assignment.find_unique(
                    where={"id": request.assignment_id}
                )
                if not assignment:
                    await context.abort(
                        grpc.StatusCode.NOT_FOUND, "Assignment not found"
                    )
                if assignment.courseId != question.courseId:
                    await context.abort(
                        grpc.StatusCode.INVALID_ARGUMENT,
                        "Assignment must belong to the same course as the question",
                    )
            update_data["assignmentId"] = (
                request.assignment_id if request.assignment_id else None
            )

        # Update the question
        updated_question = await self.prisma.assignmentquestion.update(
            where={"id": request.question_id},
            data=update_data,
        )

        return leaner_pb2.UpdateAssignmentQuestionResponse(
            question=self._convert_assignment_question_to_proto(updated_question)
        )

    async def DeleteAssignmentQuestion(
        self,
        request: leaner_pb2.DeleteAssignmentQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteAssignmentQuestionResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify question exists
        question = await self.prisma.assignmentquestion.find_unique(
            where={"id": request.question_id}
        )
        if not question:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment question not found"
            )

        # Check permissions (admin or teacher of course only)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": question.courseId}
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins and course teachers can delete assignment questions",
                )

        # Delete related data first
        answers = await self.prisma.assignmentanswer.find_many(
            where={"assignmentQuestionId": request.question_id}
        )
        for answer in answers:
            await self.prisma.assignmentgrade.delete_many(
                where={"assignmentAnswerId": answer.id}
            )
        await self.prisma.assignmentanswer.delete_many(
            where={"assignmentQuestionId": request.question_id}
        )

        # Delete the question
        await self.prisma.assignmentquestion.delete(where={"id": request.question_id})

        return leaner_pb2.DeleteAssignmentQuestionResponse()

    async def ListAssignmentQuestions(
        self,
        request: leaner_pb2.ListAssignmentQuestionsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListAssignmentQuestionsResponse:
        # Build where clause
        where_clause = {}

        # Filter by assignment if specified
        if request.HasField("assignment_id"):
            where_clause["assignmentId"] = request.assignment_id

        # If user token provided, check permissions
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )
            if not user:
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED, "Invalid user token"
                )

        # Get total count
        total_count = await self.prisma.assignmentquestion.count(where=where_clause)

        # Get paginated questions
        questions = await self.prisma.assignmentquestion.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
        )

        return leaner_pb2.ListAssignmentQuestionsResponse(
            questions=[
                self._convert_assignment_question_to_proto(q) for q in questions
            ],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(questions) == request.page_size
            else "",
        )
