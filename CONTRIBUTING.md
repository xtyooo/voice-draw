# Contribution Workflow

VoiceDraw is a competition project, so commit and PR history are part of the deliverable.

## Branches

- Keep `main` deployable.
- Use feature branches for new work: `feature/voice-parser`, `feature/flowchart-ai`, `fix/confirm-target`.
- Keep each branch focused on one feature, fix, or documentation change.

## Pull Requests

Each PR should include:

- The SDD requirement or demo scenario it addresses.
- Screenshots or a short verification note for UI changes.
- Test evidence, usually `npm run test` and `npm run build`.
- Any known limitation, especially API key or browser speech-recognition constraints.

## Commit Shape

Prefer small commits that follow the implementation sequence:

1. Specs and acceptance notes.
2. Command contracts and parser behavior.
3. Canvas/API integration.
4. UI wiring.
5. Tests and verification.

Avoid importing a large finished project in one final commit.
