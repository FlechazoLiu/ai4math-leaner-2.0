import asyncio
import time
import aiohttp
from prisma import Prisma
from prisma.enums import AnswerVerificationStatus
from typing import Optional
import os


class RemoteVerifier:
    """
    A client for the Lean verification server.

    This class provides methods to verify Lean code by making HTTP requests
    to a running verification server instance.

    Attributes:
        url (str): Base URL of the verification server.
    """

    def __init__(self, url: str):
        """
        Initialize a new RemoteVerifier.

        Args:
            url (str): Base URL of the verification server (e.g., "http://localhost:8000").
        """
        self.url = url
        self.session = None

    async def __aenter__(self):
        await self._get_session()
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.close()

    async def _get_session(self):
        """Get or create an aiohttp client session."""
        if self.session is None:
            import aiohttp

            self.session = aiohttp.ClientSession()
        return self.session

    async def verify(
        self, code: str, allow_sorry: bool = True
    ) -> tuple[bool, list[dict]]:
        """
        Verify a single piece of Lean code by making a request to the verification server.

        Args:
            code (str): The Lean code to verify.
            allow_sorry (bool, optional): Whether to allow 'sorry' in the code. Defaults to True.

        Returns:
            tuple[bool, list[dict]]: A tuple containing:
                - bool: Whether the verification was successful.
                - list[dict]: Messages from the verification process.
        """
        session = await self._get_session()
        async with session.post(
            f"{self.url}/verify", json={"code": code, "allow_sorry": allow_sorry}
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Server error: {error_text}")
            result = await response.json()
            return result["success"], result["messages"]

    async def batched_verify(
        self, codes: list[str], allow_sorry: bool = True
    ) -> list[tuple[bool, list[dict]]]:
        """
        Verify multiple pieces of Lean code in parallel by making a request to the verification server.

        Args:
            codes (list[str]): A list of Lean code snippets to verify.
            allow_sorry (bool, optional): Whether to allow 'sorry' in the code. Defaults to True.

        Returns:
            list[tuple[bool, list[str]]]: A list of verification results, each containing:
                - bool: Whether the verification was successful.
                - list[dict]: Messages from the verification process.
        """
        session = await self._get_session()
        async with session.post(
            f"{self.url}/verify/batch",
            json={"codes": codes, "allow_sorry": allow_sorry},
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"Server error: {error_text}")
            result = await response.json()
            return [(r["success"], r["messages"]) for r in result["results"]]

    async def close(self):
        """Close the HTTP client session."""
        if self.session is not None:
            await self.session.close()
            self.session = None

    def __del__(self):
        """Ensure the session is closed when the verifier is deleted."""
        if self.session is not None:
            import asyncio

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self.close())
                else:
                    loop.run_until_complete(self.close())
            except Exception:
                pass


class BuildLeanCodeService:
    def __init__(self, prisma: Optional[Prisma] = None, max_concurrent_builds: int = 5):
        self.verifier_url = os.environ.get("VERIFIER_URL", "http://localhost:8000")
        self.prisma = prisma or Prisma()
        self.max_concurrent_builds = max_concurrent_builds
        self.active_tasks = set()
        self._verifier_available = None  # None=unknown, True/False after first check
        self._last_health_check = 0
        self._consecutive_failures = 0
        self._backoff_until = 0

    async def _check_verifier_health(self) -> bool:
        """Check if the verifier is reachable. Caches result for 60 seconds."""
        now = time.time()
        if self._verifier_available is not None and now - self._last_health_check < 60:
            return self._verifier_available

        verifier = RemoteVerifier(self.verifier_url)
        try:
            async with verifier:
                session = await verifier._get_session()
                async with session.get(f"{self.verifier_url}/health", timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    self._verifier_available = resp.status == 200
        except Exception:
            self._verifier_available = False

        self._last_health_check = now
        if not self._verifier_available:
            self._consecutive_failures += 1
            if self._consecutive_failures > 5:
                backoff = min(300, self._consecutive_failures * 30)
                self._backoff_until = now + backoff
                print(f"Verifier unavailable for {self._consecutive_failures} checks. "
                      f"Backing off for {backoff}s. Answers will stay PENDING until verifier is available.")
        else:
            self._consecutive_failures = 0
            self._backoff_until = 0

        return self._verifier_available

    async def process_answer(self, answer_id: str, code: str):
        """Process a single answer asynchronously."""
        # Create a new RemoteVerifier instance for this task to avoid session conflicts
        verifier = RemoteVerifier(self.verifier_url)

        try:
            async with verifier:  # Use context manager for proper session management
                print(f"Starting verification for answer {answer_id}")
                is_valid, messages = await verifier.verify(code, allow_sorry=False)

                print(
                    f"Verification result for answer {answer_id}: is_valid={is_valid}, messages={messages}"
                )

                # Update the answer based on verification result
                if is_valid:
                    await self.prisma.answer.update(
                        where={"id": answer_id},
                        data={
                            "verificationStatus": AnswerVerificationStatus.SUCCESSFUL
                        },
                    )
                    print(f"Successfully updated answer {answer_id} to SUCCESSFUL")
                else:
                    await self.prisma.answer.update(
                        where={"id": answer_id},
                        data={"verificationStatus": AnswerVerificationStatus.FAILED},
                    )
                    print(f"Updated answer {answer_id} to FAILED due to invalid code")

        except Exception as e:
            print(f"Exception during verification for answer {answer_id}: {e}")
            print(f"Exception type: {type(e).__name__}")
            try:
                await self.prisma.answer.update(
                    where={"id": answer_id},
                    data={"verificationStatus": AnswerVerificationStatus.FAILED},
                )
                print(f"Updated answer {answer_id} to FAILED due to exception")
            except Exception as db_error:
                print(f"Error updating database for answer {answer_id}: {db_error}")
        finally:
            # Ensure the verifier is properly closed
            try:
                await verifier.close()
            except Exception:
                pass  # Ignore cleanup errors

    async def process_assignment_answer(self, assignment_answer_id: str, code: str):
        """Process a single assignment answer asynchronously."""
        # Create a new RemoteVerifier instance for this task to avoid session conflicts
        verifier = RemoteVerifier(self.verifier_url)

        try:
            async with verifier:  # Use context manager for proper session management
                print(
                    f"Starting verification for assignment answer {assignment_answer_id}"
                )
                is_valid, messages = await verifier.verify(code, allow_sorry=False)

                print(
                    f"Verification result for assignment answer {assignment_answer_id}: is_valid={is_valid}, messages={messages}"
                )

                # Update the assignment answer based on verification result
                if is_valid:
                    await self.prisma.assignmentanswer.update(
                        where={"id": assignment_answer_id},
                        data={
                            "verificationStatus": AnswerVerificationStatus.SUCCESSFUL
                        },
                    )
                    print(
                        f"Successfully updated assignment answer {assignment_answer_id} to SUCCESSFUL"
                    )
                else:
                    await self.prisma.assignmentanswer.update(
                        where={"id": assignment_answer_id},
                        data={"verificationStatus": AnswerVerificationStatus.FAILED},
                    )
                    print(
                        f"Updated assignment answer {assignment_answer_id} to FAILED due to invalid code"
                    )

        except Exception as e:
            print(
                f"Exception during verification for assignment answer {assignment_answer_id}: {e}"
            )
            print(f"Exception type: {type(e).__name__}")
            try:
                await self.prisma.assignmentanswer.update(
                    where={"id": assignment_answer_id},
                    data={"verificationStatus": AnswerVerificationStatus.FAILED},
                )
                print(
                    f"Updated assignment answer {assignment_answer_id} to FAILED due to exception"
                )
            except Exception as db_error:
                print(
                    f"Error updating database for assignment answer {assignment_answer_id}: {db_error}"
                )
        finally:
            # Ensure the verifier is properly closed
            try:
                await verifier.close()
            except Exception:
                pass  # Ignore cleanup errors

    async def run(self):
        """Main service loop that processes answers concurrently."""
        if not self.prisma.is_connected():
            await self.prisma.connect()

        while True:
            try:
                # Clean up completed tasks
                self.active_tasks = {
                    task for task in self.active_tasks if not task.done()
                }

                # Check verifier health (cached for 60s, with backoff on repeated failures)
                if not await self._check_verifier_health():
                    if time.time() < self._backoff_until:
                        await asyncio.sleep(10)
                        continue

                # Check if we can start more tasks
                if len(self.active_tasks) < self.max_concurrent_builds:
                    # Calculate how many more tasks we can start
                    available_slots = self.max_concurrent_builds - len(
                        self.active_tasks
                    )

                    # Get pending regular answers to process
                    pending_answers = await self.prisma.answer.find_many(
                        where={
                            "verificationStatus": AnswerVerificationStatus.PENDING,
                            "formalAnswerContent": {"not": None},
                        },
                        order={"createdAt": "asc"},
                        take=available_slots,
                    )

                    pending_assignment_answers = (
                        await self.prisma.assignmentanswer.find_many(
                            where={
                                "verificationStatus": AnswerVerificationStatus.PENDING,
                                "formalAnswer": {"not": None},
                            },
                            order={"createdAt": "asc"},
                            take=available_slots,
                        )
                    )

                    # Start new tasks for each pending answer
                    for answer in pending_answers:
                        if len(self.active_tasks) >= self.max_concurrent_builds:
                            break

                        # Mark as processing to avoid duplicate processing
                        await self.prisma.answer.update(
                            where={"id": answer.id},
                            data={
                                "verificationStatus": AnswerVerificationStatus.PENDING
                            },
                        )

                        # Create and start the processing task
                        task = asyncio.create_task(
                            self.process_answer(answer.id, answer.formalAnswerContent)
                        )
                        self.active_tasks.add(task)

                    for assignment_answer in pending_assignment_answers:
                        if len(self.active_tasks) >= self.max_concurrent_builds:
                            break

                        # Mark as processing to avoid duplicate processing
                        await self.prisma.assignmentanswer.update(
                            where={"id": assignment_answer.id},
                            data={
                                "verificationStatus": AnswerVerificationStatus.PENDING
                            },
                        )

                        # Create and start the processing task
                        task = asyncio.create_task(
                            self.process_assignment_answer(
                                assignment_answer.id, assignment_answer.formalAnswer
                            )
                        )
                        self.active_tasks.add(task)

                # Wait a bit before checking for more work
                await asyncio.sleep(1)

            except Exception as e:
                print(f"Error in main service loop: {e}")
                await asyncio.sleep(5)  # Wait longer on errors

    async def shutdown(self):
        """Gracefully shutdown the service."""
        # Wait for all active tasks to complete
        if self.active_tasks:
            await asyncio.gather(*self.active_tasks, return_exceptions=True)

        # Disconnect from database
        if self.prisma.is_connected():
            await self.prisma.disconnect()
