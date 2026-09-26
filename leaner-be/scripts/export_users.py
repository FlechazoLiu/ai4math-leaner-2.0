#!/usr/bin/env python3
import asyncio
import json
from datetime import datetime
from pathlib import Path

from prisma import Prisma


async def export_users():
    # Initialize Prisma client
    prisma = Prisma()
    await prisma.connect()

    try:
        # Fetch all users
        users = await prisma.user.find_many()

        # Create output directory if it doesn't exist
        output_dir = Path("exports")
        output_dir.mkdir(exist_ok=True)

        # Generate timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # # Export to JSON
        # json_path = output_dir / f'users_{timestamp}.json'
        # with open(json_path, 'w') as f:
        #     json.dump(
        #         [
        #             {
        #                 'id': user.id,
        #                 'email': user.email,
        #                 'username': user.username,
        #                 'role': user.role,
        #                 'created_at': user.createdAt.isoformat(),
        #                 'updated_at': user.updatedAt.isoformat()
        #             }
        #             for user in users
        #         ],
        #         f,
        #         indent=2
        #     )
        # print(f'Exported {len(users)} users to {json_path}')

        # Export to JSONL
        jsonl_path = output_dir / f"users_{timestamp}.jsonl"
        with open(jsonl_path, "w") as f:
            for user in users:
                json.dump(
                    {
                        "id": user.id,
                        "email": user.email,
                        "username": user.username,
                        "role": user.role,
                        "created_at": user.createdAt.isoformat(),
                        "updated_at": user.updatedAt.isoformat(),
                    },
                    f,
                )
                f.write("\n")
        print(f"Exported {len(users)} users to {jsonl_path}")

    finally:
        # Always disconnect from the database
        await prisma.disconnect()


if __name__ == "__main__":
    asyncio.run(export_users())
