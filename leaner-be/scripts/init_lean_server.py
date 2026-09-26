from lean_interact import AutoLeanServer, LeanREPLConfig, TempRequireProject, Command


def init_lean_server():
    lean_version = "v4.20.0"
    repl_config = LeanREPLConfig(
        lean_version=lean_version,
        project=TempRequireProject(require=["mathlib"]),
    )
    server = AutoLeanServer(repl_config)

    server.run(Command(cmd="import Mathlib"))


if __name__ == "__main__":
    init_lean_server()
