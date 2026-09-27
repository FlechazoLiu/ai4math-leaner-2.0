# Security Policy

## Supported versions

Only the latest release on `main` receives security fixes.

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use [**GitHub private vulnerability reporting**](https://github.com/FlechazoLiu/ai4math-leaner-2.0/security/advisories/new):

1. Go to the repository's **Security** tab → **Report a vulnerability**.
2. Describe the issue, the affected component (`leaner-fe`, `leaner-be`, `verifier`), steps to reproduce, and potential impact.

You should receive a response within a few days. We will keep you informed as the issue is triaged and fixed, and credit you in the advisory if you wish.

Please give us a reasonable window to publish a fix before any public disclosure.

## Scope

Leaner is a self-hosted teaching platform. In scope:

- Authentication and session handling
- Authorization between roles (Admin / Teacher / Assistant / Student) and across course boundaries
- Injection or stored-XSS via Lean code, Markdown/KaTeX content, file uploads, or API fields
- gRPC (`leaner-be`) and HTTP (`verifier`) API abuse
- Container/compose misconfigurations shipped in this repository that lead to exposure

Out of scope:

- Vulnerabilities in dependencies themselves — report those upstream (we still appreciate a heads-up in an advisory if a fix requires a version bump)
- Attacks requiring physical access or a already-compromised admin account
- Denial of service purely by submitting large proofs (the verifier has resource limits, see `.env.example`)

## Deployment hardening reminders

If you run Leaner in production:

- Set strong `POSTGRES_PASSWORD` and `AUTH_SECRET`; never reuse the values from `.env.example`.
- Do not expose the `verifier` (`:8030`) or `leaner-be` (`:7720`) ports beyond the Docker network — only the frontend should be reachable.
- Serve the frontend behind TLS in any environment with real users.
