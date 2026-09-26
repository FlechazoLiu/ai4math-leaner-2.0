"use server";

import { Client, createClient } from "@connectrpc/connect";
import { ConnectError } from "@connectrpc/connect";
import {
  UserService,
  TagService,
  QuestionService,
  AnswerService,
  CommentService,
  CourseService,
  AssignmentService,
  AssignmentAnswerService,
  PostService,
  NotificationService,
  ResourceService,
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  UpdateUserRoleRequest,
  ListUsersRequest,
  ListUsersResponse,
  ResetUserPasswordRequest,
  ChangePasswordRequest,
  UpdateUserRoleResponse,
  ResetUserPasswordResponse,
  ChangePasswordResponse,
  ChangeUsernameRequest,
  ChangeUsernameResponse,
  CreateTagRequest,
  CreateTagResponse,
  DeleteTagRequest,
  DeleteTagResponse,
  ListTagsRequest,
  ListTagsResponse,
  AddTagToQuestionRequest,
  AddTagToQuestionResponse,
  RemoveTagFromQuestionRequest,
  RemoveTagFromQuestionResponse,
  CreateQuestionRequest,
  CreateQuestionResponse,
  DeleteQuestionRequest,
  DeleteQuestionResponse,
  GetQuestionRequest,
  GetQuestionResponse,
  UpdateQuestionRequest,
  UpdateQuestionResponse,
  ListQuestionsRequest,
  ListQuestionsResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  GetAnswerRequest,
  GetAnswerResponse,
  UpdateAnswerRequest,
  UpdateAnswerResponse,
  ListAnswersRequest,
  ListAnswersResponse,
  GradeAnswerRequest,
  GradeAnswerResponse,
  DeleteAnswerRequest,
  DeleteAnswerResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  UpdateCommentRequest,
  UpdateCommentResponse,
  DeleteCommentRequest,
  DeleteCommentResponse,
  ListCommentsRequest,
  ListCommentsResponse,
  CreateCourseRequest,
  CreateCourseResponse,
  UpdateCourseRequest,
  UpdateCourseResponse,
  DeleteCourseRequest,
  DeleteCourseResponse,
  ListCoursesRequest,
  ListCoursesResponse,
  EnrollUserInCourseRequest,
  EnrollUserInCourseResponse,
  RemoveUserFromCourseRequest,
  RemoveUserFromCourseResponse,
  RequestToEnrollInCourseRequest,
  RequestToEnrollInCourseResponse,
  RemoveEnrollmentRequestRequest,
  RemoveEnrollmentRequestResponse,
  ListEnrollmentRequestsRequest,
  ListEnrollmentRequestsResponse,
  UpdateEnrollmentRequestStatusRequest,
  UpdateEnrollmentRequestStatusResponse,
  AssignTeacherToCourseRequest,
  AssignTeacherToCourseResponse,
  RemoveTeacherFromCourseRequest,
  RemoveTeacherFromCourseResponse,
  AssignAssistantToCourseRequest,
  AssignAssistantToCourseResponse,
  RemoveAssistantFromCourseRequest,
  RemoveAssistantFromCourseResponse,
  CreateAssignmentRequest,
  CreateAssignmentResponse,
  UpdateAssignmentRequest,
  UpdateAssignmentResponse,
  DeleteAssignmentRequest,
  DeleteAssignmentResponse,
  ListAssignmentsRequest,
  ListAssignmentsResponse,
  GetAssignmentRequest,
  GetAssignmentResponse,
  CreateAssignmentQuestionRequest,
  CreateAssignmentQuestionResponse,
  UpdateAssignmentQuestionRequest,
  UpdateAssignmentQuestionResponse,
  DeleteAssignmentQuestionRequest,
  DeleteAssignmentQuestionResponse,
  ListAssignmentQuestionsRequest,
  ListAssignmentQuestionsResponse,
  SubmitAssignmentAnswerRequest,
  SubmitAssignmentAnswerResponse,
  GetAssignmentAnswerRequest,
  GetAssignmentAnswerResponse,
  UpdateAssignmentAnswerRequest,
  UpdateAssignmentAnswerResponse,
  ListAssignmentAnswersRequest,
  ListAssignmentAnswersResponse,
  DeleteAssignmentAnswerRequest,
  DeleteAssignmentAnswerResponse,
  GradeAssignmentAnswerRequest,
  GradeAssignmentAnswerResponse,
  ReturnAssignmentAnswerRequest,
  ReturnAssignmentAnswerResponse,
  BatchReturnAssignmentAnswersRequest,
  BatchReturnAssignmentAnswersResponse,
  CreatePostRequest,
  CreatePostResponse,
  UpdatePostRequest,
  UpdatePostResponse,
  DeletePostRequest,
  DeletePostResponse,
  ListPostsRequest,
  ListPostsResponse,
  CreateNotificationRequest,
  CreateNotificationResponse,
  UpdateNotificationRequest,
  UpdateNotificationResponse,
  DeleteNotificationRequest,
  DeleteNotificationResponse,
  ListNotificationsRequest,
  ListNotificationsResponse,
  GetCourseResponse,
  GetCourseRequest,
  CheckEnrollmentResponse,
  CheckEnrollmentRequest,
  ListCourseStudentsRequest,
  ListCourseStudentsResponse,
  ListCourseAssistantsRequest,
  ListCourseAssistantsResponse,
  GetPostResponse,
  GetPostRequest,
  CreateResourceRequest,
  CreateResourceResponse,
  UpdateResourceRequest,
  UpdateResourceResponse,
  DeleteResourceRequest,
  DeleteResourceResponse,
  ListResourcesRequest,
  ListResourcesResponse,
  GetResourceRequest,
  GetResourceResponse,
  CreateUserRequest,
  CreateUserResponse,
  BatchCreateUsersRequest,
  BatchCreateUsersResponse,
  ChangePasswordOnFirstLoginRequest,
  ChangePasswordOnFirstLoginResponse,
  DeleteUserRequest,
  DeleteUserResponse,
} from "./gen/leaner/v1/leaner_pb";

import { createGrpcTransport } from "@connectrpc/connect-node";

const transport = createGrpcTransport({
  baseUrl: process.env.NEXT_PUBLIC_GRPC_SERVER_URL || "http://localhost:7720",
});

const userServiceClient: Client<typeof UserService> = createClient(
  UserService,
  transport,
);

const tagServiceClient: Client<typeof TagService> = createClient(
  TagService,
  transport,
);

const questionServiceClient: Client<typeof QuestionService> = createClient(
  QuestionService,
  transport,
);

const answerServiceClient: Client<typeof AnswerService> = createClient(
  AnswerService,
  transport,
);

const commentServiceClient: Client<typeof CommentService> = createClient(
  CommentService,
  transport,
);

const courseServiceClient: Client<typeof CourseService> = createClient(
  CourseService,
  transport,
);

const assignmentServiceClient: Client<typeof AssignmentService> = createClient(
  AssignmentService,
  transport,
);

const assignmentAnswerServiceClient: Client<typeof AssignmentAnswerService> =
  createClient(AssignmentAnswerService, transport);

const postServiceClient: Client<typeof PostService> = createClient(
  PostService,
  transport,
);

const notificationServiceClient: Client<typeof NotificationService> =
  createClient(NotificationService, transport);

const resourceServiceClient: Client<typeof ResourceService> = createClient(
  ResourceService,
  transport,
);

// Helper function to handle gRPC errors and throw user-friendly messages
function handleGrpcError(error: unknown): never {
  if (error instanceof ConnectError) {
    // Extract the exact error message from context.abort() in Python backend
    // ConnectError has a 'rawMessage' property that contains the original message
    const message =
      error.rawMessage || error.message || "An unexpected error occurred";
    throw new Error(message);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("An unexpected error occurred");
}

// Enhanced wrapper function for gRPC calls
async function callWithErrorHandling<T>(
  grpcCall: () => Promise<T>,
): Promise<T> {
  try {
    return await grpcCall();
  } catch (error) {
    handleGrpcError(error);
    throw error; // defensive re-throw
  }
}

export const signIn: (
  request: SignInRequest,
) => Promise<SignInResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.signIn(request));

export const signUp: (
  request: SignUpRequest,
) => Promise<SignUpResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.signUp(request));

export const listUsers: (
  request: ListUsersRequest,
) => Promise<ListUsersResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.listUsers(request));

export const updateUserRole: (
  request: UpdateUserRoleRequest,
) => Promise<UpdateUserRoleResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.updateUserRole(request));

export const resetUserPassword: (
  request: ResetUserPasswordRequest,
) => Promise<ResetUserPasswordResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.resetUserPassword(request));

export const changePassword: (
  request: ChangePasswordRequest,
) => Promise<ChangePasswordResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.changePassword(request));

export const changeUsername: (
  request: ChangeUsernameRequest,
) => Promise<ChangeUsernameResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.changeUsername(request));

export const createTag: (
  request: CreateTagRequest,
) => Promise<CreateTagResponse> = async (request) =>
  callWithErrorHandling(() => tagServiceClient.createTag(request));

export const deleteTag: (
  request: DeleteTagRequest,
) => Promise<DeleteTagResponse> = async (request) =>
  callWithErrorHandling(() => tagServiceClient.deleteTag(request));

export const listTags: (
  request: ListTagsRequest,
) => Promise<ListTagsResponse> = async (request) =>
  callWithErrorHandling(() => tagServiceClient.listTags(request));

export const addTagToQuestion: (
  request: AddTagToQuestionRequest,
) => Promise<AddTagToQuestionResponse> = async (request) =>
  callWithErrorHandling(() => tagServiceClient.addTagToQuestion(request));

export const removeTagFromQuestion: (
  request: RemoveTagFromQuestionRequest,
) => Promise<RemoveTagFromQuestionResponse> = async (request) =>
  callWithErrorHandling(() => tagServiceClient.removeTagFromQuestion(request));

export const createQuestion: (
  request: CreateQuestionRequest,
) => Promise<CreateQuestionResponse> = async (request) =>
  callWithErrorHandling(() => questionServiceClient.createQuestion(request));

export const deleteQuestion: (
  request: DeleteQuestionRequest,
) => Promise<DeleteQuestionResponse> = async (request) =>
  callWithErrorHandling(() => questionServiceClient.deleteQuestion(request));

export const getQuestion: (
  request: GetQuestionRequest,
) => Promise<GetQuestionResponse> = async (request) =>
  callWithErrorHandling(() => questionServiceClient.getQuestion(request));

export const updateQuestion: (
  request: UpdateQuestionRequest,
) => Promise<UpdateQuestionResponse> = async (request) =>
  callWithErrorHandling(() => questionServiceClient.updateQuestion(request));

export const listQuestions: (
  request: ListQuestionsRequest,
) => Promise<ListQuestionsResponse> = async (request) =>
  callWithErrorHandling(() => questionServiceClient.listQuestions(request));

export const submitAnswer: (
  request: SubmitAnswerRequest,
) => Promise<SubmitAnswerResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.submitAnswer(request));

export const getAnswer: (
  request: GetAnswerRequest,
) => Promise<GetAnswerResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.getAnswer(request));

export const updateAnswer: (
  request: UpdateAnswerRequest,
) => Promise<UpdateAnswerResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.updateAnswer(request));

export const listAnswers: (
  request: ListAnswersRequest,
) => Promise<ListAnswersResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.listAnswers(request));

export const deleteAnswer: (
  request: DeleteAnswerRequest,
) => Promise<DeleteAnswerResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.deleteAnswer(request));

export const gradeAnswer: (
  request: GradeAnswerRequest,
) => Promise<GradeAnswerResponse> = async (request) =>
  callWithErrorHandling(() => answerServiceClient.gradeAnswer(request));

export const createComment: (
  request: CreateCommentRequest,
) => Promise<CreateCommentResponse> = async (request) =>
  callWithErrorHandling(() => commentServiceClient.createComment(request));

export const updateComment: (
  request: UpdateCommentRequest,
) => Promise<UpdateCommentResponse> = async (request) =>
  callWithErrorHandling(() => commentServiceClient.updateComment(request));

export const deleteComment: (
  request: DeleteCommentRequest,
) => Promise<DeleteCommentResponse> = async (request) =>
  callWithErrorHandling(() => commentServiceClient.deleteComment(request));

export const listComments: (
  request: ListCommentsRequest,
) => Promise<ListCommentsResponse> = async (request) =>
  callWithErrorHandling(() => commentServiceClient.listComments(request));

// Course Service exports
export const createCourse: (
  request: CreateCourseRequest,
) => Promise<CreateCourseResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.createCourse(request));

export const updateCourse: (
  request: UpdateCourseRequest,
) => Promise<UpdateCourseResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.updateCourse(request));

export const deleteCourse: (
  request: DeleteCourseRequest,
) => Promise<DeleteCourseResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.deleteCourse(request));

export const listCourses: (
  request: ListCoursesRequest,
) => Promise<ListCoursesResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.listCourses(request));

export const getCourse: (
  request: GetCourseRequest,
) => Promise<GetCourseResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.getCourse(request));

export const checkEnrollment: (
  request: CheckEnrollmentRequest,
) => Promise<CheckEnrollmentResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.checkEnrollment(request));

export const enrollUserInCourse: (
  request: EnrollUserInCourseRequest,
) => Promise<EnrollUserInCourseResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.enrollUserInCourse(request));

export const removeUserFromCourse: (
  request: RemoveUserFromCourseRequest,
) => Promise<RemoveUserFromCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.removeUserFromCourse(request),
  );

export const assignTeacherToCourse: (
  request: AssignTeacherToCourseRequest,
) => Promise<AssignTeacherToCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.assignTeacherToCourse(request),
  );

export const removeTeacherFromCourse: (
  request: RemoveTeacherFromCourseRequest,
) => Promise<RemoveTeacherFromCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.removeTeacherFromCourse(request),
  );

export const assignAssistantToCourse: (
  request: AssignAssistantToCourseRequest,
) => Promise<AssignAssistantToCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.assignAssistantToCourse(request),
  );

export const removeAssistantFromCourse: (
  request: RemoveAssistantFromCourseRequest,
) => Promise<RemoveAssistantFromCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.removeAssistantFromCourse(request),
  );

export const requestToEnrollInCourse: (
  request: RequestToEnrollInCourseRequest,
) => Promise<RequestToEnrollInCourseResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.requestToEnrollInCourse(request),
  );

export const removeEnrollmentRequest: (
  request: RemoveEnrollmentRequestRequest,
) => Promise<RemoveEnrollmentRequestResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.removeEnrollmentRequest(request),
  );

export const listEnrollmentRequests: (
  request: ListEnrollmentRequestsRequest,
) => Promise<ListEnrollmentRequestsResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.listEnrollmentRequests(request),
  );

export const updateEnrollmentRequestStatus: (
  request: UpdateEnrollmentRequestStatusRequest,
) => Promise<UpdateEnrollmentRequestStatusResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.updateEnrollmentRequestStatus(request),
  );

// Assignment Service exports
export const createAssignment: (
  request: CreateAssignmentRequest,
) => Promise<CreateAssignmentResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.createAssignment(request),
  );

export const updateAssignment: (
  request: UpdateAssignmentRequest,
) => Promise<UpdateAssignmentResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.updateAssignment(request),
  );

export const deleteAssignment: (
  request: DeleteAssignmentRequest,
) => Promise<DeleteAssignmentResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.deleteAssignment(request),
  );

export const listAssignments: (
  request: ListAssignmentsRequest,
) => Promise<ListAssignmentsResponse> = async (request) =>
  callWithErrorHandling(() => assignmentServiceClient.listAssignments(request));

export const getAssignment: (
  request: GetAssignmentRequest,
) => Promise<GetAssignmentResponse> = async (request) =>
  callWithErrorHandling(() => assignmentServiceClient.getAssignment(request));

export const createAssignmentQuestion: (
  request: CreateAssignmentQuestionRequest,
) => Promise<CreateAssignmentQuestionResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.createAssignmentQuestion(request),
  );

export const updateAssignmentQuestion: (
  request: UpdateAssignmentQuestionRequest,
) => Promise<UpdateAssignmentQuestionResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.updateAssignmentQuestion(request),
  );

export const deleteAssignmentQuestion: (
  request: DeleteAssignmentQuestionRequest,
) => Promise<DeleteAssignmentQuestionResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.deleteAssignmentQuestion(request),
  );

export const listAssignmentQuestions: (
  request: ListAssignmentQuestionsRequest,
) => Promise<ListAssignmentQuestionsResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentServiceClient.listAssignmentQuestions(request),
  );

// Assignment Answer Service exports
export const submitAssignmentAnswer: (
  request: SubmitAssignmentAnswerRequest,
) => Promise<SubmitAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.submitAssignmentAnswer(request),
  );

export const getAssignmentAnswer: (
  request: GetAssignmentAnswerRequest,
) => Promise<GetAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.getAssignmentAnswer(request),
  );

export const updateAssignmentAnswer: (
  request: UpdateAssignmentAnswerRequest,
) => Promise<UpdateAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.updateAssignmentAnswer(request),
  );

export const listAssignmentAnswers: (
  request: ListAssignmentAnswersRequest,
) => Promise<ListAssignmentAnswersResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.listAssignmentAnswers(request),
  );

export const deleteAssignmentAnswer: (
  request: DeleteAssignmentAnswerRequest,
) => Promise<DeleteAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.deleteAssignmentAnswer(request),
  );

export const gradeAssignmentAnswer: (
  request: GradeAssignmentAnswerRequest,
) => Promise<GradeAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.gradeAssignmentAnswer(request),
  );

export const returnAssignmentAnswer: (
  request: ReturnAssignmentAnswerRequest,
) => Promise<ReturnAssignmentAnswerResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.returnAssignmentAnswer(request),
  );

export const batchReturnAssignmentAnswers: (
  request: BatchReturnAssignmentAnswersRequest,
) => Promise<BatchReturnAssignmentAnswersResponse> = async (request) =>
  callWithErrorHandling(() =>
    assignmentAnswerServiceClient.batchReturnAssignmentAnswers(request),
  );

// Post Service exports
export const createPost: (
  request: CreatePostRequest,
) => Promise<CreatePostResponse> = async (request) =>
  callWithErrorHandling(() => postServiceClient.createPost(request));

export const updatePost: (
  request: UpdatePostRequest,
) => Promise<UpdatePostResponse> = async (request) =>
  callWithErrorHandling(() => postServiceClient.updatePost(request));

export const deletePost: (
  request: DeletePostRequest,
) => Promise<DeletePostResponse> = async (request) =>
  callWithErrorHandling(() => postServiceClient.deletePost(request));

export const listPosts: (
  request: ListPostsRequest,
) => Promise<ListPostsResponse> = async (request) =>
  callWithErrorHandling(() => postServiceClient.listPosts(request));

export const getPost: (
  request: GetPostRequest,
) => Promise<GetPostResponse> = async (request) =>
  callWithErrorHandling(() => postServiceClient.getPost(request));

// Notification Service exports
export const createNotification: (
  request: CreateNotificationRequest,
) => Promise<CreateNotificationResponse> = async (request) =>
  callWithErrorHandling(() =>
    notificationServiceClient.createNotification(request),
  );

export const updateNotification: (
  request: UpdateNotificationRequest,
) => Promise<UpdateNotificationResponse> = async (request) =>
  callWithErrorHandling(() =>
    notificationServiceClient.updateNotification(request),
  );

export const deleteNotification: (
  request: DeleteNotificationRequest,
) => Promise<DeleteNotificationResponse> = async (request) =>
  callWithErrorHandling(() =>
    notificationServiceClient.deleteNotification(request),
  );

export const listNotifications: (
  request: ListNotificationsRequest,
) => Promise<ListNotificationsResponse> = async (request) =>
  callWithErrorHandling(() =>
    notificationServiceClient.listNotifications(request),
  );

// Additional Course Service exports for students and assistants
export const listCourseStudents: (
  request: ListCourseStudentsRequest,
) => Promise<ListCourseStudentsResponse> = async (request) =>
  callWithErrorHandling(() => courseServiceClient.listCourseStudents(request));

export const listCourseAssistants: (
  request: ListCourseAssistantsRequest,
) => Promise<ListCourseAssistantsResponse> = async (request) =>
  callWithErrorHandling(() =>
    courseServiceClient.listCourseAssistants(request),
  );

// Resource Service exports
export const createResource: (
  request: CreateResourceRequest,
) => Promise<CreateResourceResponse> = async (request) =>
  callWithErrorHandling(() => resourceServiceClient.createResource(request));

export const updateResource: (
  request: UpdateResourceRequest,
) => Promise<UpdateResourceResponse> = async (request) =>
  callWithErrorHandling(() => resourceServiceClient.updateResource(request));

export const deleteResource: (
  request: DeleteResourceRequest,
) => Promise<DeleteResourceResponse> = async (request) =>
  callWithErrorHandling(() => resourceServiceClient.deleteResource(request));

export const listResources: (
  request: ListResourcesRequest,
) => Promise<ListResourcesResponse> = async (request) =>
  callWithErrorHandling(() => resourceServiceClient.listResources(request));

export const getResource: (
  request: GetResourceRequest,
) => Promise<GetResourceResponse> = async (request) =>
  callWithErrorHandling(() => resourceServiceClient.getResource(request));

export const createUser: (
  request: CreateUserRequest,
) => Promise<CreateUserResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.createUser(request));

export const batchCreateUsers: (
  request: BatchCreateUsersRequest,
) => Promise<BatchCreateUsersResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.batchCreateUsers(request));

export const changePasswordOnFirstLogin: (
  request: ChangePasswordOnFirstLoginRequest,
) => Promise<ChangePasswordOnFirstLoginResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.changePasswordOnFirstLogin(request));

export const deleteUser: (
  request: DeleteUserRequest,
) => Promise<DeleteUserResponse> = async (request) =>
  callWithErrorHandling(() => userServiceClient.deleteUser(request));
