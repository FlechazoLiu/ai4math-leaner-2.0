#!/usr/bin/env python3
import asyncio
import hashlib
import os

from prisma import Prisma
from prisma.enums import Role


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


async def bootstrap_admin() -> int:
    email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
    username = os.getenv("INITIAL_ADMIN_USERNAME", "").strip()
    password = os.getenv("INITIAL_ADMIN_PASSWORD", "").strip()

    if not email and not username and not password:
        print("Initial admin bootstrap skipped: admin env vars are not set.")
        return 0

    missing = []
    if not email:
        missing.append("INITIAL_ADMIN_EMAIL")
    if not username:
        missing.append("INITIAL_ADMIN_USERNAME")
    if not password:
        missing.append("INITIAL_ADMIN_PASSWORD")
    if missing:
        print(
            "Initial admin bootstrap failed: missing required env vars: "
            + ", ".join(missing)
        )
        return 1

    prisma = Prisma()
    await prisma.connect()
    try:
        password_hash = hash_password(password)

        existing_by_email = await prisma.user.find_unique(where={"email": email})
        existing_by_username = await prisma.user.find_unique(where={"username": username})

        if existing_by_email:
            if existing_by_username and existing_by_username.id != existing_by_email.id:
                print(
                    f"Initial admin bootstrap failed: username '{username}' is already used by another account."
                )
                return 1

            # Don't overwrite password if admin has already changed it
            if existing_by_email.mustChangePassword is False and existing_by_email.role == Role.ADMIN:
                print(f"Initial admin bootstrap skipped: admin '{email}' already changed password.")
                return 0

            await prisma.user.update(
                where={"id": existing_by_email.id},
                data={
                    "username": username,
                    "password": password_hash,
                    "role": Role.ADMIN,
                },
            )
            print(f"Initial admin bootstrap updated existing user by email: {email}")
            return 0

        if existing_by_username:
            print(
                f"Initial admin bootstrap failed: username '{username}' exists with different email '{existing_by_username.email}'."
            )
            return 1

        await prisma.user.create(
            data={
                "email": email,
                "username": username,
                "password": password_hash,
                "role": Role.ADMIN,
            }
        )
        print(f"Initial admin bootstrap created admin user: {email}")
        return 0
    finally:
        await prisma.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(bootstrap_admin()))
