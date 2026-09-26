"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnswerVerificationStatus } from "@/lib/gen/leaner/v1/leaner_pb";
import { getAnswer, getAssignmentAnswer } from "@/lib/grpc";
import type {
  Answer,
  AssignmentAnswer,
  GetAnswerRequest,
  GetAssignmentAnswerRequest,
} from "@/lib/gen/leaner/v1/leaner_pb";

type PollableAnswer = (Answer | AssignmentAnswer) & {
  verificationStatus: AnswerVerificationStatus;
};

interface UseVerificationPollingOptions {
  answerId: string;
  token: string | undefined;
  type?: "exercise" | "assignment";
  intervalMs?: number;
}

/**
 * Polls for verification status changes on an answer.
 * Stops polling when status is no longer PENDING.
 */
export function useVerificationPolling({
  answerId,
  token,
  type = "exercise",
  intervalMs = 3000,
}: UseVerificationPollingOptions) {
  const [answer, setAnswer] = useState<PollableAnswer | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    if (!token || !answerId) return;
    try {
      let result: PollableAnswer | null = null;
      if (type === "assignment") {
        const resp = await getAssignmentAnswer({
          answerId,
          userToken: token,
        } as GetAssignmentAnswerRequest);
        result = resp.answer as unknown as PollableAnswer ?? null;
      } else {
        const resp = await getAnswer({
          answerId,
          userToken: token,
        } as GetAnswerRequest);
        result = resp.answer as unknown as PollableAnswer ?? null;
      }
      setAnswer(result);
      if (
        result &&
        result.verificationStatus !== AnswerVerificationStatus.PENDING
      ) {
        setIsPolling(false);
      }
    } catch {
      // Silently fail — the parent can handle errors
    }
  }, [answerId, token, type]);

  // Start/stop polling
  useEffect(() => {
    if (!token || !answerId) return;

    // Initial fetch
    fetch().then(() => setIsPolling(true));

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [answerId, token, fetch]);

  // Polling interval
  useEffect(() => {
    if (!isPolling) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(fetch, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPolling, fetch, intervalMs]);

  return { answer, isPolling, refetch: fetch };
}
