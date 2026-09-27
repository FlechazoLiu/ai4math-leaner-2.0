import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.enums import AnswerVerificationStatus
from prisma.models import AssignmentAnswer, AssignmentGrade
from typing import Optional


class AssignmentAnswerService(leaner_pb2_grpc.AssignmentAnswerServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_verification_status_to_proto(
        self, status: AnswerVerificationStatus
    ) -> leaner_pb2.AnswerVerificationStatus:
        """Convert Prisma enum to protobuf enum"""
        mapping = {
            AnswerVerificationStatus.PENDING: leaner_pb2.ANSWER_VERIFICATION_STATUS_PENDING,
            AnswerVerificationStatus.SUCCESSFUL: leaner_pb2.ANSWER_VERIFICATION_STATUS_SUCCESSFUL,
            AnswerVerificationStatus.FAILED: leaner_pb2.ANSWER_VERIFICATION_STATUS_FAILED,
            AnswerVerificationStatus.NOT_APPLICABLE: leaner_pb2.ANSWER_VERIFICATION_STATUS_NOT_APPLICABLE,
        }
        return mapping.get(status, leaner_pb2.ANSWER_VERIFICATION_STATUS_UNSPECIFIED)

    def _convert_verification_status_from_proto(
        self, status: leaner_pb2.AnswerVerificationStatus
    ) -> AnswerVerificationStatus:
        """Convert protobuf enum to Prisma enum"""
        mapping = {
            leaner_pb2.ANSWER_VERIFICATION_STATUS_PENDING: AnswerVerificationStatus.PENDING,
            leaner_pb2.ANSWER_VERIFICATION_STATUS_SUCCESSFUL: AnswerVerificationStatus.SUCCESSFUL,
            leaner_pb2.ANSWER_VERIFICATION_STATUS_FAILED: AnswerVerificationStatus.FAILED,
            leaner_pb2.ANSWER_VERIFICATION_STATUS_NOT_APPLICABLE: AnswerVerificationStatus.NOT_APPLICABLE,
        }
        return mapping.get(status, AnswerVerificationStatus.NOT_APPLICABLE)

    def _convert_assignment_answer_to_proto(
        self, answer: AssignmentAnswer
    ) -> leaner_pb2.AssignmentAnswer:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            answer.createdAt.replace(tzinfo=None)
            if answer.createdAt.tzinfo
            else answer.createdAt
        )
        updated_at_local = (
            answer.updatedAt.replace(tzinfo=None)
            if answer.updatedAt.tzinfo
            else answer.updatedAt
        )

        # Convert grades if they exist
        grades = []
        if hasattr(answer, "AssignmentGrade") and answer.AssignmentGrade:
            grades = [
                self._convert_assignment_grade_to_proto(grade)
                for grade in answer.AssignmentGrade
            ]

        # Get author name and question title if relations are loaded
        author_name = None
        question_title = None
        if hasattr(answer, "author") and answer.author:
            author_name = answer.author.displayName or answer.author.username
        if hasattr(answer, "assignmentQuestion") and answer.assignmentQuestion:
            question_title = answer.assignmentQuestion.title

        return leaner_pb2.AssignmentAnswer(
            id=answer.id,
            assignment_question_id=answer.assignmentQuestionId,
            informal_answer=answer.informalAnswer,
            formal_answer=answer.formalAnswer or "",
            verification_status=self._convert_verification_status_to_proto(
                answer.verificationStatus
            ),
            is_draft=answer.isDraft,
            author_id=answer.authorId,
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
            grades=grades,
            author_name=author_name,
            question_title=question_title,
        )

    def _convert_assignment_grade_to_proto(
        self, grade: AssignmentGrade
    ) -> leaner_pb2.AssignmentGrade:
        # Strip timezone info to ensure local time consistency
        created_at_local = (
            grade.createdAt.replace(tzinfo=None)
            if grade.createdAt.tzinfo
            else grade.createdAt
        )
        updated_at_local = (
            grade.updatedAt.replace(tzinfo=None)
            if grade.updatedAt.tzinfo
            else grade.updatedAt
        )

        return leaner_pb2.AssignmentGrade(
            id=grade.id,
            assignment_answer_id=grade.assignmentAnswerId,
            grade=grade.grade,
            graded_by_user_id=grade.gradedByUserId,
            created_at=created_at_local.isoformat(),
            updated_at=updated_at_local.isoformat(),
        )

    async def SubmitAssignmentAnswer(
        self,
        request: leaner_pb2.SubmitAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.SubmitAssignmentAnswerResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify assignment question exists
        question = await self.prisma.assignmentquestion.find_unique(
            where={"id": request.assignment_question_id}
        )
        if not question:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment question not found"
            )

        # Check if user is enrolled in the course
        enrollment = await self.prisma.courseenrollment.find_first(
            where={"userId": user.id, "courseId": question.courseId}
        )
        if not enrollment and user.role not in ["ADMIN", "TEACHER", "ASSISTANT"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "User must be enrolled in the course to submit answers",
            )

        # Check if user already has an answer for this question
        existing_answer = await self.prisma.assignmentanswer.find_first(
            where={
                "assignmentQuestionId": request.assignment_question_id,
                "authorId": user.id,
            }
        )

        # Determine verification status
        verification_status = AnswerVerificationStatus.NOT_APPLICABLE
        if request.HasField("formal_answer") and request.formal_answer:
            verification_status = AnswerVerificationStatus.PENDING

        if existing_answer:
            # Update existing answer
            answer = await self.prisma.assignmentanswer.update(
                where={"id": existing_answer.id},
                data={
                    "informalAnswer": request.informal_answer,
                    "formalAnswer": request.formal_answer
                    if request.HasField("formal_answer")
                    else None,
                    "verificationStatus": verification_status,
                    "isDraft": request.is_draft,
                },
            )
        else:
            # Create new answer
            answer = await self.prisma.assignmentanswer.create(
                data={
                    "assignmentQuestionId": request.assignment_question_id,
                    "authorId": user.id,
                    "informalAnswer": request.informal_answer,
                    "formalAnswer": request.formal_answer
                    if request.HasField("formal_answer")
                    else None,
                    "verificationStatus": verification_status,
                    "isDraft": request.is_draft,
                }
            )

        return leaner_pb2.SubmitAssignmentAnswerResponse(
            answer=self._convert_assignment_answer_to_proto(answer)
        )

    async def GetAssignmentAnswer(
        self,
        request: leaner_pb2.GetAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetAssignmentAnswerResponse:
        # Verify answer exists
        answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id},
            include={"assignmentQuestion": True, "AssignmentGrade": True, "author": True},
        )
        if not answer:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment answer not found"
            )

        # Check permissions if user token provided
        if request.HasField("user_token"):
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )
            if not user:
                await context.abort(
                    grpc.StatusCode.UNAUTHENTICATED, "Invalid user token"
                )

            # Allow access if: author, admin, teacher of course, or assistant of course
            if answer.authorId != user.id and user.role not in ["ADMIN"]:
                # Check if user is teaching or assisting the course
                teaching = await self.prisma.courseteaching.find_first(
                    where={
                        "userId": user.id,
                        "courseId": answer.assignmentQuestion.courseId,
                    }
                )
                assistant = await self.prisma.courseassistant.find_first(
                    where={
                        "userId": user.id,
                        "courseId": answer.assignmentQuestion.courseId,
                    }
                )
                if not teaching and not assistant:
                    await context.abort(
                        grpc.StatusCode.PERMISSION_DENIED,
                        "Access denied to this assignment answer",
                    )

        return leaner_pb2.GetAssignmentAnswerResponse(
            answer=self._convert_assignment_answer_to_proto(answer)
        )

    async def UpdateAssignmentAnswer(
        self,
        request: leaner_pb2.UpdateAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateAssignmentAnswerResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists
        answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id}
        )
        if not answer:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment answer not found"
            )

        # Check if user is the author
        if answer.authorId != user.id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author can update this assignment answer",
            )

        # Build update data
        update_data = {}
        if request.HasField("informal_answer"):
            update_data["informalAnswer"] = request.informal_answer
        if request.HasField("formal_answer"):
            update_data["formalAnswer"] = request.formal_answer
            # Update verification status if formal answer changed
            if request.formal_answer:
                update_data["verificationStatus"] = AnswerVerificationStatus.PENDING
            else:
                update_data["verificationStatus"] = (
                    AnswerVerificationStatus.NOT_APPLICABLE
                )
        if request.HasField("is_draft"):
            update_data["isDraft"] = request.is_draft
            # When a returned answer is resubmitted (draft→false) without changing
            # the formal answer, re-trigger verification so the answer gets processed.
            if not request.is_draft and answer.formalAnswer and "verificationStatus" not in update_data:
                update_data["verificationStatus"] = AnswerVerificationStatus.PENDING

        # Update the answer
        updated_answer = await self.prisma.assignmentanswer.update(
            where={"id": request.answer_id},
            data=update_data,
        )

        return leaner_pb2.UpdateAssignmentAnswerResponse(
            answer=self._convert_assignment_answer_to_proto(updated_answer)
        )

    async def ListAssignmentAnswers(
        self,
        request: leaner_pb2.ListAssignmentAnswersRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListAssignmentAnswersResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Build where clause
        where_clause = {}

        # Filter by assignment question if specified
        if request.HasField("assignment_question_id"):
            where_clause["assignmentQuestionId"] = request.assignment_question_id

        # Filter by author if specified
        if request.HasField("author_id"):
            where_clause["authorId"] = request.author_id

        # Exclude drafts if requested
        if request.HasField("exclude_drafts") and request.exclude_drafts:
            where_clause["isDraft"] = False

        # If not admin/teacher/assistant, only show user's own answers
        if user.role not in ["ADMIN", "TEACHER", "ASSISTANT"]:
            where_clause["authorId"] = user.id

        # Get total count
        total_count = await self.prisma.assignmentanswer.count(where=where_clause)

        # Get paginated answers
        answers = await self.prisma.assignmentanswer.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
            include={"AssignmentGrade": True, "author": True, "assignmentQuestion": True},
        )

        return leaner_pb2.ListAssignmentAnswersResponse(
            answers=[self._convert_assignment_answer_to_proto(a) for a in answers],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(answers) == request.page_size
            else "",
        )

    async def DeleteAssignmentAnswer(
        self,
        request: leaner_pb2.DeleteAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteAssignmentAnswerResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists
        answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id},
            include={"assignmentQuestion": True, "AssignmentGrade": True, "author": True},
        )
        if not answer:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment answer not found"
            )

        # Check permissions (author, admin, or teacher of course)
        if answer.authorId != user.id and user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={
                    "userId": user.id,
                    "courseId": answer.assignmentQuestion.courseId,
                }
            )
            if not teaching:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only the author, admin, or course teacher can delete this assignment answer",
                )

        # Delete grades first
        await self.prisma.assignmentgrade.delete_many(
            where={"assignmentAnswerId": request.answer_id}
        )

        # Delete the answer
        await self.prisma.assignmentanswer.delete(where={"id": request.answer_id})

        return leaner_pb2.DeleteAssignmentAnswerResponse()

    async def GradeAssignmentAnswer(
        self,
        request: leaner_pb2.GradeAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GradeAssignmentAnswerResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists
        answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id},
            include={"assignmentQuestion": True, "AssignmentGrade": True, "author": True},
        )
        if not answer:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Assignment answer not found"
            )

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={
                    "userId": user.id,
                    "courseId": answer.assignmentQuestion.courseId,
                }
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={
                    "userId": user.id,
                    "courseId": answer.assignmentQuestion.courseId,
                }
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can grade assignment answers",
                )

        # Check if already graded
        existing_grade = await self.prisma.assignmentgrade.find_first(
            where={"assignmentAnswerId": request.answer_id}
        )

        if existing_grade:
            # Update existing grade
            grade = await self.prisma.assignmentgrade.update(
                where={"id": existing_grade.id},
                data={
                    "grade": request.grade,
                    "gradedByUserId": user.id,
                },
            )
        else:
            # Create new grade
            grade = await self.prisma.assignmentgrade.create(
                data={
                    "assignmentAnswerId": request.answer_id,
                    "grade": request.grade,
                    "gradedByUserId": user.id,
                }
            )

        # Get updated answer
        updated_answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id}
        )

        return leaner_pb2.GradeAssignmentAnswerResponse(
            grade=self._convert_assignment_grade_to_proto(grade),
            answer=self._convert_assignment_answer_to_proto(updated_answer),
        )

    async def ReturnAssignmentAnswer(
        self,
        request: leaner_pb2.ReturnAssignmentAnswerRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ReturnAssignmentAnswerResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify answer exists
        answer = await self.prisma.assignmentanswer.find_unique(
            where={"id": request.answer_id},
            include={"assignmentQuestion": True},
        )
        if not answer:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment answer not found")

        # Check permissions (admin, teacher, or assistant of course)
        if user.role not in ["ADMIN"]:
            teaching = await self.prisma.courseteaching.find_first(
                where={"userId": user.id, "courseId": answer.assignmentQuestion.courseId}
            )
            assistant = await self.prisma.courseassistant.find_first(
                where={"userId": user.id, "courseId": answer.assignmentQuestion.courseId}
            )
            if not teaching and not assistant:
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED,
                    "Only admins, course teachers, and assistants can return assignment answers",
                )

        # Delete existing grades
        await self.prisma.assignmentgrade.delete_many(
            where={"assignmentAnswerId": request.answer_id}
        )

        # Set isDraft to true and reset verification status
        updated_answer = await self.prisma.assignmentanswer.update(
            where={"id": request.answer_id},
            data={
                "isDraft": True,
                "verificationStatus": AnswerVerificationStatus.NOT_APPLICABLE,
            },
        )

        return leaner_pb2.ReturnAssignmentAnswerResponse(
            answer=self._convert_assignment_answer_to_proto(updated_answer)
        )

    async def BatchReturnAssignmentAnswers(
        self,
        request: leaner_pb2.BatchReturnAssignmentAnswersRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.BatchReturnAssignmentAnswersResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Verify assignment question exists
        question = await self.prisma.assignmentquestion.find_unique(
            where={"id": request.assignment_question_id}
        )
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Assignment question not found")

        # Check permissions (admin, teacher, or assistant of course)
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
                    "Only admins, course teachers, and assistants can batch return assignment answers",
                )

        # Return all non-draft answers for this question
        result = await self.prisma.assignmentanswer.update_many(
            where={
                "assignmentQuestionId": request.assignment_question_id,
                "isDraft": False,
            },
            data={
                "isDraft": True,
                "verificationStatus": AnswerVerificationStatus.NOT_APPLICABLE,
            },
        )

        return leaner_pb2.BatchReturnAssignmentAnswersResponse(count=result.count)
