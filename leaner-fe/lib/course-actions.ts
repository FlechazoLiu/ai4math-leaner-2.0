"use server";

import { auth } from "@/lib/auth";
import {
  deleteCourse,
  createNotification,
  assignAssistantToCourse,
  listAssignments,
  listCourseStudents,
  listCourseAssistants,
  updateNotification,
  deleteNotification,
} from "@/lib/grpc";
import {
  DeleteCourseRequest,
  CreateNotificationRequest,
  AssignAssistantToCourseRequest,
  ListAssignmentsRequest,
  ListCourseStudentsRequest,
  ListCourseAssistantsRequest,
  UpdateNotificationRequest,
  DeleteNotificationRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";

export async function deleteCourseAction(courseId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  // Check if user is admin
  if (session.user.role !== 1) {
    throw new Error("Only admins can delete courses");
  }

  try {
    const request = {
      courseId: courseId,
      userToken: session.user.token,
    } satisfies Partial<DeleteCourseRequest>;
    await deleteCourse(request as DeleteCourseRequest);
  } catch (error) {
    console.error("Error deleting course:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to delete course";
    throw new Error(errorMsg);
  }
}

export async function createCourseNotification(
  courseId: string,
  title: string,
  message: string,
) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const request = {
      title: title,
      message: message,
      courseId: courseId,
      userToken: session.user.token,
    } satisfies Partial<CreateNotificationRequest>;
    const response = await createNotification(
      request as CreateNotificationRequest,
    );
    return { success: true, data: response.notification };
  } catch (error) {
    console.error("Error creating notification:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to create notification";
    return { success: false, error: errorMsg };
  }
}

export async function assignAssistant(courseId: string, userEmail: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const request = {
      courseId: courseId,
      userId: userEmail,
      userToken: session.user.token,
    } satisfies Partial<AssignAssistantToCourseRequest>;
    await assignAssistantToCourse(request as AssignAssistantToCourseRequest);
    return { success: true };
  } catch (error) {
    console.error("Error assigning assistant:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to assign assistant";
    return { success: false, error: errorMsg };
  }
}

export async function getCourseStatistics(courseId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const stats = {
      totalStudents: 0,
      pendingRequests: 0,
      totalAssignments: 0,
      totalAssistants: 0,
    };

    // Get assignments count
    try {
      const assignmentsRequest = {
        courseId: courseId,
        userToken: session.user.token,
        pageSize: 1000,
      } satisfies Partial<ListAssignmentsRequest>;
      const assignmentsResponse = await listAssignments(
        assignmentsRequest as ListAssignmentsRequest,
      );
      stats.totalAssignments = assignmentsResponse.assignments?.length || 0;
    } catch (error) {
      console.error("Error fetching assignments for stats:", error);
    }

    // Get students count
    try {
      const studentsRequest = {
        courseId: courseId,
        userToken: session.user.token,
        pageSize: 1000,
      } satisfies Partial<ListCourseStudentsRequest>;
      const studentsResponse = await listCourseStudents(
        studentsRequest as ListCourseStudentsRequest,
      );
      stats.totalStudents = studentsResponse.students?.length || 0;
    } catch (error) {
      console.error("Error fetching students for stats:", error);
    }

    // Get assistants count
    try {
      const assistantsRequest = {
        courseId: courseId,
        userToken: session.user.token,
        pageSize: 1000,
      } satisfies Partial<ListCourseAssistantsRequest>;
      const assistantsResponse = await listCourseAssistants(
        assistantsRequest as ListCourseAssistantsRequest,
      );
      stats.totalAssistants = assistantsResponse.assistants?.length || 0;
    } catch (error) {
      console.error("Error fetching assistants for stats:", error);
    }

    return { success: true, data: stats };
  } catch (error) {
    console.error("Error fetching course statistics:", error);
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Failed to fetch course statistics";
    return { success: false, error: errorMsg };
  }
}

export async function updateCourseNotification(
  notificationId: string,
  title: string,
  message: string,
) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const updateRequest = {
      notificationId: notificationId,
      userToken: session.user.token,
      title: title,
      message: message,
    } satisfies Partial<UpdateNotificationRequest>;

    await updateNotification(updateRequest as UpdateNotificationRequest);
    return { success: true };
  } catch (error) {
    console.error("Error updating notification:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update notification";
    return { success: false, error: errorMsg };
  }
}

export async function deleteCourseNotification(notificationId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const deleteRequest = {
      notificationId: notificationId,
      userToken: session.user.token,
    } satisfies Partial<DeleteNotificationRequest>;

    await deleteNotification(deleteRequest as DeleteNotificationRequest);
    return { success: true };
  } catch (error) {
    console.error("Error deleting notification:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to delete notification";
    return { success: false, error: errorMsg };
  }
}
