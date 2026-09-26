import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from typing import Optional
from prisma import Prisma
from prisma.models import Question
from prisma.enums import Role, MathDifficulty, LeanDifficulty


class QuestionService(leaner_pb2_grpc.QuestionServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_math_difficulty_to_proto(
        self, math_difficulty: MathDifficulty
    ) -> leaner_pb2.MathDifficulty:
        difficulty_mapping = {
            "SIMP": leaner_pb2.MATH_DIFFICULTY_SIMP,
            "EASY": leaner_pb2.MATH_DIFFICULTY_EASY,
            "MEDIUM": leaner_pb2.MATH_DIFFICULTY_MEDIUM,
            "HARD": leaner_pb2.MATH_DIFFICULTY_HARD,
            "SORRY": leaner_pb2.MATH_DIFFICULTY_SORRY,
        }
        return difficulty_mapping.get(
            math_difficulty, leaner_pb2.MATH_DIFFICULTY_UNSPECIFIED
        )

    def _convert_lean_difficulty_to_proto(
        self, lean_difficulty: LeanDifficulty
    ) -> leaner_pb2.LeanDifficulty:
        difficulty_mapping = {
            "SIMP": leaner_pb2.LEAN_DIFFICULTY_SIMP,
            "EASY": leaner_pb2.LEAN_DIFFICULTY_EASY,
            "MEDIUM": leaner_pb2.LEAN_DIFFICULTY_MEDIUM,
            "HARD": leaner_pb2.LEAN_DIFFICULTY_HARD,
            "SORRY": leaner_pb2.LEAN_DIFFICULTY_SORRY,
        }
        return difficulty_mapping.get(
            lean_difficulty, leaner_pb2.LEAN_DIFFICULTY_UNSPECIFIED
        )

    def _proto_math_difficulty_to_prisma(
        self, math_difficulty: leaner_pb2.MathDifficulty
    ) -> MathDifficulty:
        return leaner_pb2.MathDifficulty.Name(math_difficulty).replace(
            "MATH_DIFFICULTY_", ""
        )

    def _proto_lean_difficulty_to_prisma(
        self, lean_difficulty: leaner_pb2.LeanDifficulty
    ) -> LeanDifficulty:
        return leaner_pb2.LeanDifficulty.Name(lean_difficulty).replace(
            "LEAN_DIFFICULTY_", ""
        )

    def _convert_question_to_proto(self, question: Question) -> leaner_pb2.Question:
        return leaner_pb2.Question(
            id=question.id,
            title=question.title,
            informal_description=question.informalDescription,
            formal_description=question.formalDescription,
            tags=[
                leaner_pb2.Tag(id=tag.tag.id, name=tag.tag.name)
                for tag in question.tags
            ],
            math_difficulty=self._convert_math_difficulty_to_proto(
                question.mathDifficulty
            ),
            lean_difficulty=self._convert_lean_difficulty_to_proto(
                question.leanDifficulty
            ),
            author_id=question.authorId,
        )

    async def CreateQuestion(
        self,
        request: leaner_pb2.CreateQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateQuestionResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")

        question = await self.prisma.question.create(
            data={
                "title": request.title,
                "informalDescription": request.informal_description,
                "formalDescription": request.formal_description,
                "leanDifficulty": self._proto_lean_difficulty_to_prisma(
                    request.lean_difficulty
                ),
                "mathDifficulty": self._proto_math_difficulty_to_prisma(
                    request.math_difficulty
                ),
                "authorId": user.id,
            }
        )
        await self.prisma.questiontag.create_many(
            data=[
                {"questionId": question.id, "tagId": tag_id}
                for tag_id in request.tag_ids
            ]
        )
        print(f"CreateQuestion called with title: {request.title}")

        updated_question = await self.prisma.question.find_unique(
            where={"id": question.id}, include={"tags": {"include": {"tag": True}}}
        )
        return leaner_pb2.CreateQuestionResponse(
            question=self._convert_question_to_proto(updated_question)
        )

    async def GetQuestion(
        self, request: leaner_pb2.GetQuestionRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.GetQuestionResponse:
        print(f"GetQuestion called for id: {request.id}")
        question = await self.prisma.question.find_unique(
            where={"id": request.id}, include={"tags": {"include": {"tag": True}}}
        )
        return leaner_pb2.GetQuestionResponse(
            question=self._convert_question_to_proto(question)
        )

    async def UpdateQuestion(
        self,
        request: leaner_pb2.UpdateQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateQuestionResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")

        # Verify question exists and user is the author
        question = await self.prisma.question.find_unique(
            where={"id": request.id}, include={"tags": {"include": {"tag": True}}}
        )
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Question not found")

        if question.authorId != user.id and user.role != Role.ADMIN:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author or admin can update this question",
            )

        # Update question
        updated_question = await self.prisma.question.update(
            where={"id": request.id},
            data={
                "title": request.title,
                "informalDescription": request.informal_description,
                "formalDescription": request.formal_description,
                "mathDifficulty": self._proto_math_difficulty_to_prisma(
                    request.math_difficulty
                ),
                "leanDifficulty": self._proto_lean_difficulty_to_prisma(
                    request.lean_difficulty
                ),
            },
            include={"tags": {"include": {"tag": True}}},
        )

        # Update tags if provided
        if request.tag_ids:
            # Delete existing tags
            await self.prisma.questiontag.delete_many(where={"questionId": request.id})
            # Create new tags
            await self.prisma.questiontag.create_many(
                data=[
                    {"questionId": request.id, "tagId": tag_id}
                    for tag_id in request.tag_ids
                ]
            )
            # Fetch updated question with new tags
            updated_question = await self.prisma.question.find_unique(
                where={"id": request.id}, include={"tags": {"include": {"tag": True}}}
            )

        return leaner_pb2.UpdateQuestionResponse(
            question=self._convert_question_to_proto(updated_question)
        )

    async def DeleteQuestion(
        self,
        request: leaner_pb2.DeleteQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteQuestionResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")

        # Verify question exists and user is the author
        question = await self.prisma.question.find_unique(where={"id": request.id})
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Question not found")

        if question.authorId != user.id and user.role != Role.ADMIN:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the author or admin can delete this question",
            )

        # Delete all related records in correct order to avoid foreign key constraints

        # 1. First, get all answers for this question
        answers = await self.prisma.answer.find_many(
            where={"questionId": request.id},
        )

        answer_ids = [answer.id for answer in answers]

        if answer_ids:
            # 2. Delete comments on these answers
            await self.prisma.comment.delete_many(
                where={"answerId": {"in": answer_ids}}
            )

            # 3. Delete grading records for these answers
            await self.prisma.grading.delete_many(
                where={"answerId": {"in": answer_ids}}
            )

        # 4. Delete answers for this question
        await self.prisma.answer.delete_many(where={"questionId": request.id})

        # 5. Delete question-tag relationships
        await self.prisma.questiontag.delete_many(where={"questionId": request.id})

        # 6. Finally, delete the question
        await self.prisma.question.delete(where={"id": request.id})

        return leaner_pb2.DeleteQuestionResponse()

    async def ListQuestions(
        self,
        request: leaner_pb2.ListQuestionsRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListQuestionsResponse:
        # Build where clause based on filters
        where_clause = {}

        if request.HasField("math_difficulty"):
            where_clause["mathDifficulty"] = self._proto_math_difficulty_to_prisma(
                request.math_difficulty
            )

        if request.HasField("lean_difficulty"):
            where_clause["leanDifficulty"] = self._proto_lean_difficulty_to_prisma(
                request.lean_difficulty
            )

        if request.HasField("tag_name") and request.tag_name:
            where_clause["tags"] = {"some": {"tag": {"name": request.tag_name}}}

        if request.HasField("title_filter") and request.title_filter:
            where_clause["title"] = {
                "startsWith": request.title_filter,
                "mode": "insensitive",
            }

        if request.HasField("author_id") and request.author_id:
            where_clause["authorId"] = request.author_id

        # Get total count
        total_count = await self.prisma.question.count(where=where_clause)

        # If page_token is "0", return all data without chunking
        if request.page_token == "0":
            questions = await self.prisma.question.find_many(
                where=where_clause,
                include={"tags": {"include": {"tag": True}}},
                order={"createdAt": "desc"},
            )

            return leaner_pb2.ListQuestionsResponse(
                questions=[self._convert_question_to_proto(q) for q in questions],
                total_count=total_count,
                next_page_token="",
            )

        # Get paginated questions
        questions = await self.prisma.question.find_many(
            where=where_clause,
            include={"tags": {"include": {"tag": True}}},
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"createdAt": "desc"},
        )

        return leaner_pb2.ListQuestionsResponse(
            questions=[self._convert_question_to_proto(q) for q in questions],
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(questions) == request.page_size
            else "",
        )
