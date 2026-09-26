import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from prisma.models import Tag
from prisma.enums import Role
from typing import Optional


class TagService(leaner_pb2_grpc.TagServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_tag_to_proto(self, tag: Tag) -> leaner_pb2.Tag:
        return leaner_pb2.Tag(id=tag.id, name=tag.name)

    async def CreateTag(
        self, request: leaner_pb2.CreateTagRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.CreateTagResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")
        print(f"CreateTag called with name: {request.name}")
        tag = await self.prisma.tag.create(data={"name": request.name})
        return leaner_pb2.CreateTagResponse(tag=self._convert_tag_to_proto(tag))

    async def DeleteTag(
        self, request: leaner_pb2.DeleteTagRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.DeleteTagResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")
        print(f"DeleteTag called for id: {request.id}")
        await self.prisma.tag.delete(where={"id": request.id})
        # Placeholder
        return leaner_pb2.DeleteTagResponse()

    async def ListTags(
        self, request: leaner_pb2.ListTagsRequest, context: grpc.aio.ServicerContext
    ) -> leaner_pb2.ListTagsResponse:
        # Build where clause for filtering
        where_clause = {}

        # Add name filter if provided
        if hasattr(request, "name_filter") and request.name_filter:
            where_clause["name"] = {
                "startswith": request.name_filter,
                "mode": "insensitive",  # Case-insensitive search
            }

        # Get total count with filters applied
        total_count = await self.prisma.tag.count(where=where_clause)

        # If page_token is "0", return all data without chunking
        if request.page_token == "0":
            tags = await self.prisma.tag.find_many(
                where=where_clause,
                order={"name": "asc"},
            )
            return leaner_pb2.ListTagsResponse(
                tags=list(map(lambda tag: self._convert_tag_to_proto(tag), tags)),
                total_count=total_count,
                next_page_token="",
            )

        # Get paginated tags with filters
        tags = await self.prisma.tag.find_many(
            where=where_clause,
            skip=request.page_size * (int(request.page_token) - 1)
            if request.page_token
            else 0,
            take=request.page_size,
            order={"name": "asc"},
        )

        return leaner_pb2.ListTagsResponse(
            tags=list(map(lambda tag: self._convert_tag_to_proto(tag), tags)),
            total_count=total_count,
            next_page_token=str(int(request.page_token or 1) + 1)
            if len(tags) == request.page_size
            else "",
        )

    async def AddTagToQuestion(
        self,
        request: leaner_pb2.AddTagToQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.AddTagToQuestionResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")
        # Verify both question and tag exist
        question = await self.prisma.question.find_unique(
            where={"id": request.question_id},
            include={"tags": {"include": {"tag": True}}},
        )
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Question not found")

        tag = await self.prisma.tag.find_unique(where={"id": request.tag_id})
        if not tag:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Tag not found")

        # Check if the relationship already exists
        existing_relation = await self.prisma.questiontag.find_unique(
            where={
                "questionId_tagId": {
                    "questionId": request.question_id,
                    "tagId": request.tag_id,
                }
            }
        )
        if existing_relation:
            await context.abort(
                grpc.StatusCode.ALREADY_EXISTS, "Tag already added to question"
            )

        # Create the relationship
        await self.prisma.questiontag.create(
            data={"questionId": request.question_id, "tagId": request.tag_id}
        )

        # Fetch the updated question with its tags
        updated_question = await self.prisma.question.find_unique(
            where={"id": request.question_id},
            include={"tags": {"include": {"tag": True}}},
        )

        # Convert to proto response
        return leaner_pb2.AddTagToQuestionResponse(
            question=leaner_pb2.Question(
                id=updated_question.id,
                title=updated_question.title,
                informal_description=updated_question.informalDescription,
                formal_description=updated_question.formalDescription,
                math_difficulty=updated_question.mathDifficulty,
                lean_difficulty=updated_question.leanDifficulty,
                author_id=updated_question.authorId,
                tags=[
                    self._convert_tag_to_proto(qt.tag) for qt in updated_question.tags
                ],
            )
        )

    async def RemoveTagFromQuestion(
        self,
        request: leaner_pb2.RemoveTagFromQuestionRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.RemoveTagFromQuestionResponse:
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if user.role == Role.STUDENT:
            await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Permission denied")
        # Verify both question and tag exist
        question = await self.prisma.question.find_unique(
            where={"id": request.question_id},
            include={"tags": {"include": {"tag": True}}},
        )
        if not question:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Question not found")

        tag = await self.prisma.tag.find_unique(where={"id": request.tag_id})
        if not tag:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Tag not found")

        # Check if the relationship exists
        existing_relation = await self.prisma.questiontag.find_unique(
            where={
                "questionId_tagId": {
                    "questionId": request.question_id,
                    "tagId": request.tag_id,
                }
            }
        )
        if not existing_relation:
            await context.abort(
                grpc.StatusCode.NOT_FOUND, "Tag is not associated with this question"
            )

        # Delete the relationship
        await self.prisma.questiontag.delete(
            where={
                "questionId_tagId": {
                    "questionId": request.question_id,
                    "tagId": request.tag_id,
                }
            }
        )

        # Fetch the updated question with its tags
        updated_question = await self.prisma.question.find_unique(
            where={"id": request.question_id},
            include={"tags": {"include": {"tag": True}}},
        )

        # Convert to proto response
        return leaner_pb2.RemoveTagFromQuestionResponse(
            question=leaner_pb2.Question(
                id=updated_question.id,
                title=updated_question.title,
                informal_description=updated_question.informalDescription,
                formal_description=updated_question.formalDescription,
                math_difficulty=updated_question.mathDifficulty,
                lean_difficulty=updated_question.leanDifficulty,
                author_id=updated_question.authorId,
                tags=[
                    self._convert_tag_to_proto(qt.tag) for qt in updated_question.tags
                ],
            )
        )
