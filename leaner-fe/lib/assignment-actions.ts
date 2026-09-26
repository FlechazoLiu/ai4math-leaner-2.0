"use server";

import { auth } from "@/lib/auth";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
} from "@/lib/grpc";
import {
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  DeleteAssignmentRequest,
  GetAssignmentRequest,
  ListAssignmentsRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";

export async function createAssignmentAction(
  courseId: string,
  title: string,
  description: string,
) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  // Check if user has permission (admin or teacher)
  if (!session.user.role || ![1, 2].includes(session.user.role)) {
    throw new Error("Permission denied");
  }

  try {
    const request = {
      courseId: courseId,
      userToken: session.user.token,
      title: title,
      description: description,
      isDraft: true, // Create as draft
    } satisfies Partial<CreateAssignmentRequest>;

    const response = await createAssignment(request as CreateAssignmentRequest);
    return { success: true, assignment: response.assignment };
  } catch (error) {
    console.error("Error creating assignment:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to create assignment";
    return { success: false, error: errorMsg };
  }
}

export async function updateAssignmentAction(
  assignmentId: string,
  title: string,
  description: string,
) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const request = {
      assignmentId: assignmentId,
      userToken: session.user.token,
      title: title,
      description: description,
    } satisfies Partial<UpdateAssignmentRequest>;

    await updateAssignment(request as UpdateAssignmentRequest);
    return { success: true };
  } catch (error) {
    console.error("Error updating assignment:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to update assignment";
    return { success: false, error: errorMsg };
  }
}

export async function deleteAssignmentAction(assignmentId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  // Check if user has permission (admin only for now)
  if (!session.user.role || session.user.role !== 1) {
    throw new Error("Permission denied. Only admins can delete assignments.");
  }

  try {
    const request = {
      assignmentId: assignmentId,
      userToken: session.user.token,
    } satisfies Partial<DeleteAssignmentRequest>;

    await deleteAssignment(request as DeleteAssignmentRequest);
    return { success: true };
  } catch (error) {
    console.error("Error deleting assignment:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to delete assignment";
    return { success: false, error: errorMsg };
  }
}

export async function getAssignmentAction(assignmentId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const request = {
      assignmentId: assignmentId,
      userToken: session.user.token,
    } satisfies Partial<GetAssignmentRequest>;

    const response = await getAssignment(request as GetAssignmentRequest);
    return { success: true, assignment: response.assignment };
  } catch (error) {
    console.error("Error fetching assignment:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to fetch assignment";
    return { success: false, error: errorMsg };
  }
}

export async function listAssignmentsAction(courseId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  try {
    const request = {
      courseId: courseId,
      userToken: session.user.token,
      pageSize: 50,
      pageToken: "1",
    } satisfies Partial<ListAssignmentsRequest>;

    const response = await listAssignments(request as ListAssignmentsRequest);
    return { success: true, assignments: response.assignments || [] };
  } catch (error) {
    console.error("Error listing assignments:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to list assignments";
    return { success: false, error: errorMsg };
  }
}

// Note: Question management for assignments is handled through
// createAssignmentQuestion and deleteAssignmentQuestion APIs directly.

export async function publishAssignmentAction(assignmentId: string) {
  const session = await auth();

  if (!session?.user?.token) {
    throw new Error("Unauthorized");
  }

  // Check if user has permission (admin or teacher)
  if (!session.user.role || ![1, 2].includes(session.user.role)) {
    throw new Error("Permission denied");
  }

  try {
    const request = {
      assignmentId: assignmentId,
      userToken: session.user.token,
      isDraft: false, // Publish the assignment
    } satisfies Partial<UpdateAssignmentRequest>;

    await updateAssignment(request as UpdateAssignmentRequest);
    return { success: true };
  } catch (error) {
    console.error("Error publishing assignment:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Failed to publish assignment";
    return { success: false, error: errorMsg };
  }
}
