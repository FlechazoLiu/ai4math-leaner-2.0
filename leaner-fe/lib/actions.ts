"use server";

import {
  CreateTagRequest,
  CreateTagResponse,
} from "@/lib/gen/leaner/v1/leaner_pb";
import { createTag } from "@/lib/grpc";

export async function createTagAction(
  name: string,
  userToken: string,
): Promise<CreateTagResponse> {
  const request = {
    name: name.trim(),
    userToken,
  } as CreateTagRequest;

  return await createTag(request);
}
