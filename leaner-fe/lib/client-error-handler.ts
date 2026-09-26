"use client";

import { toast } from "sonner";

/**
 * Client-side error handler that displays toast notifications for errors
 * and provides consistent error handling across the application
 */
export class ClientErrorHandler {
  /**
   * Handle and display gRPC errors with toast notifications
   */
  static handleError(error: unknown, customMessage?: string): void {
    let errorMessage: string;

    if (error instanceof Error) {
      // Use the error message from the backend (which includes context.abort messages)
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else {
      errorMessage = "An unexpected error occurred";
    }

    // Use custom message if provided, otherwise use the extracted error message
    const displayMessage = customMessage || errorMessage;

    // Display toast notification
    toast.error(displayMessage + errorMessage);

    // Also log to console for debugging
    console.error("Error:", error);
  }

  /**
   * Wrapper function for async operations that automatically handles errors
   * Usage: await ClientErrorHandler.withErrorHandling(async () => { ... })
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    customErrorMessage?: string,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      ClientErrorHandler.handleError(error, customErrorMessage);
      return null;
    }
  }

  /**
   * Show success toast notification
   */
  static showSuccess(message: string): void {
    toast.success(message);
  }

  /**
   * Show info toast notification
   */
  static showInfo(message: string): void {
    toast.info(message);
  }

  /**
   * Show warning toast notification
   */
  static showWarning(message: string): void {
    toast.warning(message);
  }
}

/**
 * Convenience function for error handling
 */
export const handleError = ClientErrorHandler.handleError;

/**
 * Convenience function for async operations with error handling
 */
export const withErrorHandling = ClientErrorHandler.withErrorHandling;
