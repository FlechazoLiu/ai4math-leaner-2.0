# Contributing to Leaner

Thanks for your interest in improving Leaner! 💜

## Ways to contribute

- **Report bugs** — open an [issue](https://github.com/FlechazoLiu/ai4math-leaner-2.0/issues) with steps to reproduce, expected vs. actual behavior, and your environment (browser, Docker version, `.env` settings that don't contain secrets).
- **Suggest features** — check the [roadmap](README.md#%EF%B8%8F-roadmap) first, then open an issue describing the use case.
- **Improve docs** — clarification PRs are always welcome, in English or Chinese.
- **Fix bugs / implement features** — see below.

## Development setup

Follow [docs/setup.md](docs/setup.md) to get the services running. The short version:

```bash
nix develop        # all toolchains (Node + pnpm, Python + uv, buf, …)
cp .env.example .env   # fill in POSTGRES_PASSWORD, AUTH_SECRET, …
make init-services     # pg + backend + frontend
make up-verifier       # optional: Lean verifier (needs ~8 GB RAM)
```

Everything (formatting, linting, codegen) is driven from the root `Makefile` inside `nix develop`:

| Command | What it does |
|---|---|
| `make fmt` | Format Protobuf (`buf format`), frontend (Prettier), backend (Ruff) |
| `make lint` | Run all linters — the same command CI runs |
| `make proto` | Regenerate Connect-RPC clients and gRPC stubs from `protos/` |

## Pull request guidelines

1. **Discuss first for non-trivial changes.** Open an issue before large refactors or new features so we can align on the approach.
2. **Keep PRs focused** — one logical change per PR, with a clear description.
3. **Branch from `main`** and keep your branch up to date with it.
4. **Run the checks locally** before opening a PR:

   ```bash
   nix develop --command make fmt
   nix develop --command make lint
   ```

5. **Regenerate code when Protobuf contracts change**: `make proto`, and commit the generated code.
6. **Don't commit secrets** — no real credentials, tokens, or personal data in code, fixtures, or screenshots.

### Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary in imperative mood>

<optional body explaining why>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `ci`, `chore`. Scopes are typically service names: `fe`, `be`, `verifier`, `proto`, `docs`.

## Code style notes

- **Frontend (`leaner-fe/`)**: TypeScript strict mode, functional React components, Tailwind for styling. Prettier owns the formatting — don't hand-format.
- **Backend (`leaner-be/`)**: async-first (`grpc.aio`, `aiohttp`), type hints everywhere. Ruff owns the formatting.
- **Protobuf (`protos/`)**: API changes must stay backwards-compatible within a minor release; bump the package version (`leaner.v1`) consciously.

## Reporting security issues

Please do **not** open public issues for security problems — see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
