import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Answer, Grading
from prisma.enums import Role, AnswerVerificationStatus
from typing import Optional


class AnswerService(leaner_pb2_grpc.AnswerServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_answer_verification_status_to_proto(
        self, status: AnswerVerificationStatus
    ) -> leaner_pb2.AnswerVerificationStatus:
        status_mapping = {
            "PENDING": leaner_pb2.ANSWER_VERIFICATION_STATUS_PENDING,
            "SUCCESSFUL": leaner_pb2.ANSWER_VERIFICATION_STATUS_SUCCESSFUL,
            "FAILED": leaner_pb2.ANSWER_VERIFICATION_STATUS_FAILED,
            "NOT_APPLICABLE": leaner_pb2.ANSWER_VERIFICATION_STATUS_NOT_APPLICABLE,
        }
        return status_mapping.get(
            status, leaner_pb2.ANSWER_VERIFICATION_STATUS_UNSPECIFIED
        )

    def _convert_grading_to_proto(self, grading: Grading) -> leaner_pb2.Grading:
        return leaner_pb2.Grading(
            id=grading.id,
            answer_id=grading.answerId,
            graded_by_user_id=grading.gradedByUserId,
            graded_by_user_name=grading.gradedByUser.username,
            score=grading.score,
            feedback_text=grading.feedbackText,
        )

    async def _convert_answer_to_proto(self, answer: Answer) -> leaner_pb2.Answer:
        grading_proto = None
        if answer.grading:
            grading_proto = self._convert_grading_to_proto(answer.grading)

        return leaner_pb2.Answer(
            id=answer.id,
            question_id=answer.questionId,
            question_title=answer.question.title,
            user_name=answer.user.username,
            verification_status=self._convert_answer_verification_status_to_proto(
                answer.verificationStatus
            ),
            informal_answer_content=answer.informalAnswerContent,
            formal_answer_content=answer.formalAnswerContent,
            grading=grading_proto,
            is_draft=answer.isDraft,
        )

    def _apply_grading_status_filter(
        self, where_clause: dict, grading_filter: leaner_pb2.GradingStatusFilter
    ):
        """Apply grading status filter to the where clause"""
        if grading_filter == leaner_pb2.GRADING_STATUS_FILTER_GRADED:
            # Only answers that have grading records
            where_clause["grading"] = {"isNot": None}
        elif grading_filter == leaner_pb2.GRADING_STATUS_FILTER_UNGRADED:
            # Only answers that don't have grading records
            where_clause["grading"] = None

    async def SubmitAnswer(
        self,
        request: leaner_pb2.SubmitAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.SubmitAnswerResponse:
        # Get user from token in request
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify question exists
        question = await self.prisma.question.find_unique(
            where={"id": request.question_id}
        )
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Question not found")

        # Create the answer
        answer = await self.prisma.answer.create(
            data={
                "questionId": request.question_id,
                "userId": user.id,
                "informalAnswerContent": request.informal_answer_content
                if request.HasField("informal_answer_content")
                else None,
                "formalAnswerContent": request.formal_answer_content
                if request.HasField("formal_answer_content")
                else None,
                "verificationStatus": AnswerVerificationStatus.PENDING
                if request.formal_answer_content
                else AnswerVerificationStatus.NOT_APPLICABLE,
                "isDraft": request.is_draft,
            },
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "user": True,
                "question": True,
            },
        )

        return leaner_pb2.SubmitAnswerResponse(
            answer=await self._convert_answer_to_proto(answer)
        )

    async def GetAnswer(
        self,
        request: leaner_pb2.GetAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetAnswerResponse:
        # Get the answer
        answer = await self.prisma.answer.find_unique(
            where={"id": request.answer_id},
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "question": True,
                "user": True,
            },
        )
        if not answer:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Answer not found")

        # If user token provided, check permissions
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )
            if not user:
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED, "Invalid user token"
                )

            # Check if user is the author or has admin/teacher privileges
            if answer.userId != user.id and user.role not in [
                Role.ADMIN,
                Role.TEACHER,
                Role.ASSISTANT,
            ]:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Can only view your own answers or have admin/teacher privileges",
                )

        return leaner_pb2.GetAnswerResponse(
            answer=await self._convert_answer_to_proto(answer)
        )

    async def UpdateAnswer(
        self,
        request: leaner_pb2.UpdateAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateAnswerResponse:
        # Get user from token in request
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists
        answer = await self.prisma.answer.find_unique(
            where={"id": request.answer_id},
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "user": True,
                "question": True,
            },
        )
        if not answer:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Answer not found")

        # Check if user is the author
        if answer.userId != user.id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author can update this answer",
            )

        # Prepare update data
        update_data = {}
        if request.HasField("informal_answer_content"):
            update_data["informalAnswerContent"] = request.informal_answer_content
        if request.HasField("formal_answer_content"):
            update_data["formalAnswerContent"] = request.formal_answer_content
            if request.formal_answer_content != answer.formalAnswerContent:
                update_data["verificationStatus"] = AnswerVerificationStatus.PENDING
        if request.HasField("is_draft"):
            update_data["isDraft"] = request.is_draft

        # Update the answer
        updated_answer = await self.prisma.answer.update(
            where={"id": request.answer_id},
            data=update_data,
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "user": True,
                "question": True,
            },
        )

        return leaner_pb2.UpdateAnswerResponse(
            answer=await self._convert_answer_to_proto(updated_answer)
        )

    async def ListAnswers(
        self,
        request: leaner_pb2.ListAnswersRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListAnswersResponse:
        # Get user from token in request
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Build where clause based on filters
        where_clause = {}

        if request.HasField("question_title"):
            where_clause["question"] = {
                "title": {
                    "startsWith": request.question_title,
                    "mode": "insensitive",
                }
            }

        # Handle user filtering by username instead of user_id
        if request.HasField("user_name"):
            filter_user = await self.prisma.user.find_unique(
                where={"username": request.user_name}
            )
            if filter_user:
                where_clause["userId"] = filter_user.id
            else:
                where_clause["userId"] = ""

        # Exclude drafts if requested
        if request.HasField("exclude_drafts") and request.exclude_drafts:
            where_clause["isDraft"] = False

        # Apply grading status filter if specified
        if request.HasField("grading_status_filter"):
            self._apply_grading_status_filter(
                where_clause, request.grading_status_filter
            )

        # Authorization: users can see their own answers
        # Teachers/admins can see all answers
        if user.role not in [Role.ADMIN, Role.TEACHER, Role.ASSISTANT]:
            # Students can only see their own answers
            if not (
                request.HasField("user_name") and request.user_name == user.username
            ):
                # If not viewing own answers, only show user's own answers
                where_clause["userId"] = user.id

        # Get total count
        total_count = await self.prisma.answer.count(where=where_clause)

        # If page_token is "0", return all data without chunking
        if request.page_token == "0":
            answers = await self.prisma.answer.find_many(
                where=where_clause,
                include={
                    "grading": {
                        "include": {"gradedByUser": True},
                    },
                    "question": True,
                    "user": True,
                },
                order={"createdAt": "desc"},
            )

            return leaner_pb2.ListAnswersResponse(
                answers=[await self._convert_answer_to_proto(a) for a in answers],
                total_count=total_count,
                next_page_token="",
            )

        # Get paginated answers
        answers = await self.prisma.answer.find_many(
            where=where_clause,
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "question": True,
                "user": True,
            },
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
        )

        return leaner_pb2.ListAnswersResponse(
            answers=[await self._convert_answer_to_proto(a) for a in answers],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(answers) == request.page_size
            else "",
        )

    async def DeleteAnswer(
        self,
        request: leaner_pb2.DeleteAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteAnswerResponse:
        # Get user from token in request
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists and fetch with grading
        answer = await self.prisma.answer.find_unique(
            where={"id": request.answer_id},
            include={"grading": True},
        )
        if not answer:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Answer not found")

        # Check if user is admin
        if user.role != Role.ADMIN:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the admin can delete this answer",
            )

        # Delete grading first if it exists (to avoid foreign key constraint violation)
        if answer.grading:
            await self.prisma.grading.delete(where={"answerId": request.answer_id})

        # Note: Comments are now associated with posts, not answers, so no need to delete comments

        # Now delete the answer
        await self.prisma.answer.delete(where={"id": request.answer_id})

        return leaner_pb2.DeleteAnswerResponse()

    async def GradeAnswer(
        self,
        request: leaner_pb2.GradeAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GradeAnswerResponse:
        # Get user from token in request
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check if user has permission to grade (teacher or assistant)
        if user.role not in [Role.TEACHER, Role.ASSISTANT, Role.ADMIN]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only teachers and assistants can grade answers",
            )

        # Verify answer exists
        answer = await self.prisma.answer.find_unique(
            where={"id": request.answer_id},
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "question": True,
                "user": True,
            },
        )
        if not answer:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Answer not found")

        # Validate score range
        if request.score < 0 or request.score > 100:
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT, "Score must be between 0 and 100"
            )

        # Check if answer is already graded
        if answer.grading:
            # Update existing grading
            grading = await self.prisma.grading.update(
                where={"answerId": request.answer_id},
                data={
                    "score": request.score,
                    "feedbackText": request.feedback_text,
                    "gradedByUserId": user.id,
                },
                include={
                    "gradedByUser": True,
                },
            )
        else:
            # Create new grading
            grading = await self.prisma.grading.create(
                data={
                    "answerId": request.answer_id,
                    "score": request.score,
                    "feedbackText": request.feedback_text,
                    "gradedByUserId": user.id,
                },
                include={
                    "gradedByUser": True,
                },
            )

        # Get updated answer with grading
        updated_answer = await self.prisma.answer.find_unique(
            where={"id": request.answer_id},
            include={
                "grading": {
                    "include": {"gradedByUser": True},
                },
                "user": True,
                "question": True,
            },
        )

        return leaner_pb2.GradeAnswerResponse(
            grading=self._convert_grading_to_proto(grading),
            answer=await self._convert_answer_to_proto(updated_answer),
        )
