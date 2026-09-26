#!/usr/bin/env python3
import asyncio
import sys
from prisma import Prisma
from prisma.enums import Role


async def set_user_role(email: str, role: str):
    # Initialize Prisma client
    prisma = Prisma()
    await prisma.connect()

    try:
        # Validate role
        try:
            role_enum = Role[role.upper()]
        except KeyError:
            print(
                f"Error: Invalid role '{role}'. Valid roles are: {', '.join(r.name for r in Role)}"
            )
            return False

        # Find and update user
        user = await prisma.user.update(
            where={"email": email}, data={"role": role_enum}
        )

        if user:
            print(f"Successfully updated role for user {email} to {role}")
            return True
        else:
            print(f"Error: User with email {email} not found")
            return False

    finally:
        # Always disconnect from the database
        await prisma.disconnect()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python set_user_role.py <email> <role>")
        print(f"Valid roles: {', '.join(r.name for r in Role)}")
        sys.exit(1)

    email = sys.argv[1]
    role = sys.argv[2]

    success = asyncio.run(set_user_role(email, role))
    sys.exit(0 if success else 1)
