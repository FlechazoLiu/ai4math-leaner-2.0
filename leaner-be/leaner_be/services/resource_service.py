import grpc
from leaner.v1 import leaner_pb2
from leaner.v1 import leaner_pb2_grpc
from prisma import Prisma
from typing import Optional
from prisma.models import Resource


class ResourceService(leaner_pb2_grpc.ResourceServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()

    def _convert_resource_to_proto(self, resource: Resource) -> leaner_pb2.Resource:
        return leaner_pb2.Resource(
            id=resource.id,
            title=resource.title,
            description=resource.description,
            url=resource.url,
            created_by=resource.createdBy,
            creator_name=resource.creator.username,
            created_at=resource.createdAt.isoformat() if resource.createdAt else "",
            updated_at=resource.updatedAt.isoformat() if resource.updatedAt else "",
        )

    async def CreateResource(
        self,
        request: leaner_pb2.CreateResourceRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.CreateResourceResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Check user permissions (only teachers and admins can create resources)
        if user.role not in ["ADMIN", "TEACHER"]:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only teachers and admins can create resources",
            )

        # Validate URL format
        if not request.url.startswith(("http://", "https://")):
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "URL must start with http:// or https://",
            )

        try:
            # Create the resource
            resource = await self.prisma.resource.create(
                data={
                    "title": request.title,
                    "description": request.description,
                    "url": request.url,
                    "createdBy": user.id,
                },
                include={"creator": True},
            )

            return leaner_pb2.CreateResourceResponse(
                resource=self._convert_resource_to_proto(resource)
            )
        except Exception as e:
            await context.abort(
                grpc.StatusCode.INTERNAL, f"Failed to create resource: {str(e)}"
            )

    async def UpdateResource(
        self,
        request: leaner_pb2.UpdateResourceRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.UpdateResourceResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Get the resource
        resource = await self.prisma.resource.find_unique(
            where={"id": request.resource_id}, include={"creator": True}
        )
        if not resource:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Resource not found")

        # Check permissions (only creator, admins, or teachers can update)
        if user.role not in ["ADMIN", "TEACHER"] and resource.createdBy != user.id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the creator, teachers, or admins can update resources",
            )

        # Validate URL format if provided
        if request.url and not request.url.startswith(("http://", "https://")):
            await context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "URL must start with http:// or https://",
            )

        try:
            # Prepare update data
            update_data = {}
            if request.title:
                update_data["title"] = request.title
            if request.description:
                update_data["description"] = request.description
            if request.url:
                update_data["url"] = request.url

            # Update the resource
            updated_resource = await self.prisma.resource.update(
                where={"id": request.resource_id},
                data=update_data,
                include={"creator": True},
            )

            return leaner_pb2.UpdateResourceResponse(
                resource=self._convert_resource_to_proto(updated_resource)
            )
        except Exception as e:
            await context.abort(
                grpc.StatusCode.INTERNAL, f"Failed to update resource: {str(e)}"
            )

    async def DeleteResource(
        self,
        request: leaner_pb2.DeleteResourceRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.DeleteResourceResponse:
        # Get user from token
        user = await self.prisma.user.find_unique(where={"token": request.user_token})
        if not user:
            await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid user token")

        # Get the resource
        resource = await self.prisma.resource.find_unique(
            where={"id": request.resource_id}
        )
        if not resource:
            await context.abort(grpc.StatusCode.NOT_FOUND, "Resource not found")

        # Check permissions (only creator, admins, or teachers can delete)
        if user.role not in ["ADMIN", "TEACHER"] and resource.createdBy != user.id:
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Only the creator, teachers, or admins can delete resources",
            )

        try:
            # Delete the resource
            await self.prisma.resource.delete(where={"id": request.resource_id})

            return leaner_pb2.DeleteResourceResponse()
        except Exception as e:
            await context.abort(
                grpc.StatusCode.INTERNAL, f"Failed to delete resource: {str(e)}"
            )

    async def ListResources(
        self,
        request: leaner_pb2.ListResourcesRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.ListResourcesResponse:
        # Get user from token if provided (for future use)
        if request.user_token:
            await self.prisma.user.find_unique(where={"token": request.user_token})

        try:
            # Get total count
            total_count = await self.prisma.resource.count()

            # Get resources with pagination
            resources = await self.prisma.resource.find_many(
                skip=int(request.page_token) if request.page_token else 0,
                take=request.page_size if request.page_size > 0 else 50,
                include={"creator": True},
                order={"createdAt": "desc"},
            )

            # Convert to proto format
            proto_resources = [
                self._convert_resource_to_proto(resource) for resource in resources
            ]

            # Calculate next page token
            next_page_token = ""
            if len(resources) == request.page_size:
                next_page_token = str(
                    (int(request.page_token) if request.page_token else 0)
                    + request.page_size
                )

            return leaner_pb2.ListResourcesResponse(
                resources=proto_resources,
                next_page_token=next_page_token,
                total_count=total_count,
            )
        except Exception as e:
            await context.abort(
                grpc.StatusCode.INTERNAL, f"Failed to list resources: {str(e)}"
            )

    async def GetResource(
        self,
        request: leaner_pb2.GetResourceRequest,
        context: grpc.aio.ServicerContext,
    ) -> leaner_pb2.GetResourceResponse:
        # Get user from token if provided (for future use)
        if request.user_token:
            await self.prisma.user.find_unique(where={"token": request.user_token})

        try:
            # Get the resource
            resource = await self.prisma.resource.find_unique(
                where={"id": request.resource_id}, include={"creator": True}
            )
            if not resource:
                await context.abort(grpc.StatusCode.NOT_FOUND, "Resource not found")

            return leaner_pb2.GetResourceResponse(
                resource=self._convert_resource_to_proto(resource)
            )
        except Exception as e:
            await context.abort(
                grpc.StatusCode.INTERNAL, f"Failed to get resource: {str(e)}"
            )
