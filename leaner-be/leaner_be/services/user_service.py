from typing import Optional
import hashlib
import os
from prisma import Prisma
from prisma.models import User as PrismaUser

from leaner.v1.leaner_pb2 import (
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    User,
    ListUsersRequest,
    ListUsersResponse,
    UpdateUserRoleRequest,
    ResetUserPasswordRequest,
    ChangePasswordRequest,
    Role as ProtoRole,
    UpdateUserRoleResponse,
    ResetUserPasswordResponse,
    ChangePasswordResponse,
    ChangeUsernameRequest,
    ChangeUsernameResponse,
    CreateUserRequest,
    CreateUserResponse,
    BatchCreateUsersRequest,
    BatchCreateUsersResponse,
    BatchCreateUsersResult,
    ChangePasswordOnFirstLoginRequest,
    ChangePasswordOnFirstLoginResponse,
    DeleteUserRequest,
    DeleteUserResponse,
)
from leaner.v1.leaner_pb2_grpc import UserServiceServicer
import grpc
import logging
import uuid

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


class UserService(UserServiceServicer):
    def __init__(self, prisma: Optional[Prisma] = None):
        self.prisma = prisma or Prisma()
        logger.debug("UserService initialized")

    def _hash_password(self, password: str) -> str:
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def _convert_role_to_proto(self, role: str) -> ProtoRole:
        role_mapping = {
            "ADMIN": ProtoRole.ROLE_ADMIN,
            "TEACHER": ProtoRole.ROLE_TEACHER,
            "ASSISTANT": ProtoRole.ROLE_ASSISTANT,
            "STUDENT": ProtoRole.ROLE_STUDENT,
        }
        return role_mapping.get(role, ProtoRole.ROLE_UNSPECIFIED)

    def _proto_role_to_prisma(self, role: ProtoRole) -> str:
        role_name = ProtoRole.Name(role).replace("ROLE_", "")
        return role_name

    def _prisma_user_to_proto(self, user: PrismaUser) -> User:
        user_proto = User()
        user_proto.id = user.id
        user_proto.email = user.email or ""
        user_proto.username = user.username
        user_proto.role = self._convert_role_to_proto(user.role)
        user_proto.student_id = user.studentId or ""
        user_proto.display_name = user.displayName or ""
        user_proto.must_change_password = user.mustChangePassword
        return user_proto

    def _generate_session_token(self) -> str:
        """Generate a unique session token using UUID"""
        return str(uuid.uuid4())

    async def SignUp(
        self, request: SignUpRequest, context: grpc.aio.ServicerContext
    ) -> SignUpResponse:
        # Check if self-registration is disabled
        if os.getenv("DISABLE_SELF_REGISTRATION", "true").lower() == "true":
            await context.abort(
                grpc.StatusCode.PERMISSION_DENIED,
                "Self-registration is disabled. Contact an administrator.",
            )

        logger.debug(
            f"SignUp called with email: {request.email}, username: {request.username}"
        )

        try:
            # Check if email already exists
            existing_user = await self.prisma.user.find_first(
                where={
                    "email": request.email,
                }
            )
            if existing_user:
                logger.debug(f"Email already registered: {request.email}")
                await context.abort(
                    grpc.StatusCode.ALREADY_EXISTS, "Email already registered"
                )

            # Check if username already exists
            existing_username = await self.prisma.user.find_first(
                where={
                    "username": request.username,
                }
            )
            if existing_username:
                logger.debug(f"Username already taken: {request.username}")
                await context.abort(
                    grpc.StatusCode.ALREADY_EXISTS, "Username already taken"
                )

            # Hash password
            hashed_password = self._hash_password(request.password)

            # Create new user
            logger.debug(
                f"Creating new user with email: {request.email}, username: {request.username}"
            )
            new_user = await self.prisma.user.create(
                data={
                    "email": request.email,
                    "password": hashed_password,
                    "username": request.username,
                    "role": "STUDENT",
                    "mustChangePassword": False,
                }
            )
            logger.debug(f"User created with id: {new_user.id}")

            # Create response
            response = SignUpResponse()
            user_proto = self._prisma_user_to_proto(new_user)
            response.user.CopyFrom(user_proto)
            return response
        except Exception as e:
            logger.error(f"Error in SignUp: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def SignIn(
        self, request: SignInRequest, context: grpc.aio.ServicerContext
    ) -> SignInResponse:
        login_id = request.student_id or request.email or ""
        logger.debug(f"SignIn called with student_id/email: {login_id}")

        try:
            # Get user from database — support student_id or email
            user = None
            if request.student_id:
                user = await self.prisma.user.find_unique(
                    where={"studentId": request.student_id}
                )
            if not user and request.email:
                user = await self.prisma.user.find_unique(
                    where={"email": request.email}
                )

            if not user:
                logger.debug(f"User not found: {login_id}")
                await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")

            # Hash the provided password and compare
            hashed_password = self._hash_password(request.password)
            if user.password != hashed_password:
                logger.debug(f"Invalid password for user: {login_id}")
                await context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid password")

            logger.debug(f"User authenticated: {user.email or user.studentId}")

            # Create response
            response = SignInResponse()
            token = self._generate_session_token()
            response.token = token
            await self.prisma.user.update(data={"token": token}, where={"id": user.id})

            # Set user data
            user_proto = self._prisma_user_to_proto(user)
            response.user.CopyFrom(user_proto)
            response.must_change_password = user.mustChangePassword
            return response
        except grpc.aio.AioRpcError:
            raise
        except Exception as e:
            logger.error(f"Error in SignIn: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def ListUsers(
        self, request: ListUsersRequest, context: grpc.aio.ServicerContext
    ) -> ListUsersResponse:
        logger.debug("ListUsers called")
        try:
            # Build where clause for filtering
            where_clause = {}
            if request.username_filter:
                # Search across username, displayName, and email
                search = request.username_filter
                where_clause["OR"] = [
                    {"username": {"contains": search, "mode": "insensitive"}},
                    {"displayName": {"contains": search, "mode": "insensitive"}},
                    {"email": {"contains": search, "mode": "insensitive"}},
                    {"studentId": {"contains": search}},
                ]

            # If page_token is "0", return all data without chunking
            if request.page_token == "0":
                users = await self.prisma.user.find_many(
                    where=where_clause,
                    order={
                        "username": "asc",
                    },
                )

                response = ListUsersResponse()
                response.total_count = await self.prisma.user.count(where=where_clause)
                response.next_page_token = ""
                for user in users:
                    user_proto = self._prisma_user_to_proto(user)
                    response.users.append(user_proto)

                return response

            users = await self.prisma.user.find_many(
                where=where_clause,
                skip=request.page_size * (int(request.page_token) - 1)
                if request.page_token
                else 0,
                take=request.page_size,
                order={
                    "username": "asc",
                },
            )

            response = ListUsersResponse()
            response.total_count = await self.prisma.user.count(where=where_clause)
            response.next_page_token = (
                str(int(request.page_token) + 1) if request.page_token else ""
            )
            for user in users:
                user_proto = self._prisma_user_to_proto(user)
                response.users.append(user_proto)

            return response
        except Exception as e:
            logger.error(f"Error in ListUsers: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def UpdateUserRole(
        self, request: UpdateUserRoleRequest, context: grpc.aio.ServicerContext
    ) -> UpdateUserRoleResponse:
        logger.debug(f"UpdateUserRole called for user ID: {request.user_id}")
        try:
            prisma_role = self._proto_role_to_prisma(request.role)
            logger.debug(f"Updating user {request.user_id} to role {prisma_role}")

            user = await self.prisma.user.update(
                where={"id": request.user_id},
                data={"role": prisma_role},
            )

            response = UpdateUserRoleResponse(user=self._prisma_user_to_proto(user))
            return response
        except Exception as e:
            logger.error(f"Error in UpdateUserRole: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def ResetUserPassword(
        self, request: ResetUserPasswordRequest, context: grpc.aio.ServicerContext
    ) -> ResetUserPasswordResponse:
        logger.debug(f"ResetUserPassword called for user ID: {request.user_id}")
        try:
            # Generate a random 12-character password
            new_password = uuid.uuid4().hex[:12]

            # Hash the password
            hashed_password = self._hash_password(new_password)

            # Update the user's password and reset must_change_password flag
            user = await self.prisma.user.update(
                where={"id": request.user_id},
                data={"password": hashed_password, "mustChangePassword": True},
            )

            logger.info(
                f"New password for user {request.user_id} ({user.email or user.studentId or user.username}): {new_password}"
            )

            return ResetUserPasswordResponse()
        except Exception as e:
            logger.error(f"Error in ResetUserPassword: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def ChangePassword(
        self, request: ChangePasswordRequest, context: grpc.aio.ServicerContext
    ) -> ChangePasswordResponse:
        logger.debug(f"ChangePassword called for email: {request.email}")
        try:
            # Find user by id, email, studentId, or username
            user = await self.prisma.user.find_unique(where={"id": request.email})
            if not user:
                user = await self.prisma.user.find_unique(where={"email": request.email})
            if not user:
                user = await self.prisma.user.find_unique(where={"studentId": request.email})
            if not user:
                user = await self.prisma.user.find_first(
                    where={"OR": [{"username": request.email}]}
                )

            if not user:
                logger.debug(f"User not found for email: {request.email}")
                await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")

            # Verify old password
            hashed_old_password = self._hash_password(request.old_password)
            if user.password != hashed_old_password:
                logger.debug(f"Invalid old password for user: {request.email}")
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED, "Invalid old password"
                )

            # Hash the new password
            hashed_new_password = self._hash_password(request.new_password)

            # Update the user's password
            await self.prisma.user.update(
                where={"id": user.id}, data={"password": hashed_new_password}
            )

            logger.info(
                f"Password changed successfully for user {user.id} ({user.email})"
            )
            return ChangePasswordResponse()
        except Exception as e:
            logger.error(f"Error in ChangePassword: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def ChangeUsername(
        self, request: ChangeUsernameRequest, context: grpc.aio.ServicerContext
    ) -> ChangeUsernameResponse:
        logger.debug(f"ChangeUsername called for user token: {request.user_token}")
        try:
            # Find user by token
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )

            if not user:
                logger.debug(f"User not found for token: {request.user_token}")
                await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")

            # Verify password
            hashed_password = self._hash_password(request.password)
            if user.password != hashed_password:
                logger.debug(f"Invalid password for user: {request.user_token}")
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED, "Invalid password"
                )

            # Update the user's username
            await self.prisma.user.update(
                where={"id": user.id}, data={"username": request.new_username}
            )

            return ChangeUsernameResponse()
        except Exception as e:
            logger.error(f"Error in ChangeUsername: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def CreateUser(
        self, request: CreateUserRequest, context: grpc.aio.ServicerContext
    ) -> CreateUserResponse:
        logger.debug(f"CreateUser called for student_id: {request.student_id}")
        try:
            # 1. Verify admin token
            admin = await self.prisma.user.find_unique(
                where={"token": request.admin_token}
            )
            if not admin or admin.role != "ADMIN":
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED, "Admin access required"
                )

            role_str = self._proto_role_to_prisma(request.role) if request.role != ProtoRole.ROLE_UNSPECIFIED else "STUDENT"
            is_student = role_str == "STUDENT"

            # 2. Every user must have at least student_id or email
            if not request.student_id and not request.email:
                await context.abort(
                    grpc.StatusCode.INVALID_ARGUMENT, "At least one of student_id or email is required"
                )

            # 3. For students, student_id is required
            if is_student:
                if not request.student_id:
                    await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Student ID is required for student role")
                existing = await self.prisma.user.find_unique(
                    where={"studentId": request.student_id}
                )
                if existing:
                    await context.abort(
                        grpc.StatusCode.ALREADY_EXISTS, f"Student ID {request.student_id} already exists"
                    )

            # 5. Check email uniqueness
            if request.email:
                existing_email = await self.prisma.user.find_unique(
                    where={"email": request.email}
                )
                if existing_email:
                    await context.abort(
                        grpc.StatusCode.ALREADY_EXISTS, f"Email {request.email} already registered"
                    )

            # 6. Create user
            username = request.student_id or request.email or request.display_name or f"user_{uuid.uuid4().hex[:8]}"
            password = request.student_id or "default123456"
            hashed = self._hash_password(password)

            user = await self.prisma.user.create(data={
                "studentId": request.student_id if request.student_id else None,
                "displayName": request.display_name,
                "email": request.email if request.email else None,
                "username": username,
                "password": hashed,
                "role": role_str,
                "mustChangePassword": True,
            })

            response = CreateUserResponse()
            response.user.CopyFrom(self._prisma_user_to_proto(user))
            return response
        except grpc.aio.AioRpcError:
            raise
        except Exception as e:
            logger.error(f"Error in CreateUser: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def BatchCreateUsers(
        self, request: BatchCreateUsersRequest, context: grpc.aio.ServicerContext
    ) -> BatchCreateUsersResponse:
        logger.debug(f"BatchCreateUsers called with {len(request.users)} users")
        try:
            # 1. Verify admin token
            admin = await self.prisma.user.find_unique(
                where={"token": request.admin_token}
            )
            if not admin or admin.role != "ADMIN":
                await context.abort(
                    grpc.StatusCode.PERMISSION_DENIED, "Admin access required"
                )

            role_str = self._proto_role_to_prisma(request.role) if request.role != ProtoRole.ROLE_UNSPECIFIED else "STUDENT"
            response = BatchCreateUsersResponse()
            success_count = 0
            fail_count = 0

            for entry in request.users:
                result = BatchCreateUsersResult()
                result.student_id = entry.student_id
                try:
                    hashed = self._hash_password(entry.student_id)
                    await self.prisma.user.create(data={
                        "studentId": entry.student_id,
                        "displayName": entry.display_name,
                        "email": entry.email if entry.email else None,
                        "username": entry.student_id,
                        "password": hashed,
                        "role": role_str,
                        "mustChangePassword": True,
                    })
                    result.success = True
                    success_count += 1
                except Exception as e:
                    result.success = False
                    result.error_message = str(e)
                    fail_count += 1
                response.results.append(result)

            response.success_count = success_count
            response.fail_count = fail_count
            return response
        except grpc.aio.AioRpcError:
            raise
        except Exception as e:
            logger.error(f"Error in BatchCreateUsers: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def ChangePasswordOnFirstLogin(
        self, request: ChangePasswordOnFirstLoginRequest, context: grpc.aio.ServicerContext
    ) -> ChangePasswordOnFirstLoginResponse:
        logger.debug("ChangePasswordOnFirstLogin called")
        try:
            user = await self.prisma.user.find_unique(
                where={"token": request.user_token}
            )
            if not user:
                await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
            if not user.mustChangePassword:
                await context.abort(
                    grpc.StatusCode.FAILED_PRECONDITION,
                    "Password has already been changed",
                )

            hashed = self._hash_password(request.new_password)
            await self.prisma.user.update(
                where={"id": user.id},
                data={"password": hashed, "mustChangePassword": False},
            )

            logger.info(f"First-login password changed for user {user.id} ({user.studentId})")
            return ChangePasswordOnFirstLoginResponse()
        except grpc.aio.AioRpcError:
            raise
        except Exception as e:
            logger.error(f"Error in ChangePasswordOnFirstLogin: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")

    async def DeleteUser(
        self, request: DeleteUserRequest, context: grpc.aio.ServicerContext
    ) -> DeleteUserResponse:
        logger.debug(f"DeleteUser called for user_id: {request.user_id}")
        try:
            admin = await self.prisma.user.find_unique(where={"token": request.admin_token})
            if not admin or admin.role != "ADMIN":
                await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Admin access required")

            user = await self.prisma.user.find_unique(where={"id": request.user_id})
            if not user:
                await context.abort(grpc.StatusCode.NOT_FOUND, "User not found")
            if user.role == "ADMIN":
                await context.abort(grpc.StatusCode.PERMISSION_DENIED, "Cannot delete admin users")

            await self.prisma.courseenrollment.delete_many(where={"userId": request.user_id})
            await self.prisma.courseteaching.delete_many(where={"userId": request.user_id})
            await self.prisma.courseassistant.delete_many(where={"userId": request.user_id})
            await self.prisma.enrollmentrequest.delete_many(where={"userId": request.user_id})
            await self.prisma.notification.delete_many(where={"userId": request.user_id})

            # Delete user's answers and their grades
            user_answers = await self.prisma.assignmentanswer.find_many(where={"authorId": request.user_id})
            for ans in user_answers:
                await self.prisma.assignmentgrade.delete_many(where={"assignmentAnswerId": ans.id})
            await self.prisma.assignmentanswer.delete_many(where={"authorId": request.user_id})

            # Delete practice answers and their grades
            practice_answers = await self.prisma.answer.find_many(where={"userId": request.user_id})
            for ans in practice_answers:
                await self.prisma.grading.delete_many(where={"answerId": ans.id})
            await self.prisma.answer.delete_many(where={"userId": request.user_id})

            # Delete questions authored by this user
            await self.prisma.question.delete_many(where={"authorId": request.user_id})

            # Delete user's comments and posts
            await self.prisma.comment.delete_many(where={"userId": request.user_id})
            await self.prisma.post.delete_many(where={"userId": request.user_id})

            # Delete user's resources
            await self.prisma.resource.delete_many(where={"createdBy": request.user_id})

            # Delete assignment grades where user was the grader (of someone else's answers)
            await self.prisma.assignmentgrade.delete_many(where={"gradedByUserId": request.user_id})

            # Delete practice answer gradings where user was the grader
            await self.prisma.grading.delete_many(where={"gradedByUserId": request.user_id})

            await self.prisma.user.delete(where={"id": request.user_id})
            logger.info(f"User {request.user_id} ({user.studentId or user.email}) deleted by admin")
            return DeleteUserResponse()
        except grpc.aio.AioRpcError:
            raise
        except Exception as e:
            logger.error(f"Error in DeleteUser: {str(e)}")
            await context.abort(grpc.StatusCode.INTERNAL, f"Internal error: {str(e)}")
