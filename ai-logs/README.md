# AI logs

This folder holds the full history of the AI conversations used to build this project, wrong turns included (take-home brief, §2).

## What is here

- `00-planning/`: planning artifacts. `kitchen-queue.prompt.json` is the build plan produced in the first session. `PLAN.md` is its readable version, with the amendments the author requested before the build.
- `NN-phase-topic.md`: one file per AI session, in order. Prompts and replies are verbatim. Tool calls are collapsed, and long outputs are abbreviated.

## For the author: what to export

Export every session, including the ones that went wrong.

1. One file per session, named `NN-phase-topic.md`. `NN` continues the sequence, `phase` is `planning` or `build`, and `topic` says what the session covered. Example: `03-build-T01-T12-core.md`.
2. Export the whole conversation: every prompt, every reply and the tool activity. Do not trim failed attempts or corrections.
3. Export a session after it ends, so the file includes its last reply.
4. Commit the file with the message `ai-logs: add the log of <session>`.

The AI section of `DECISIONS.md` is written by the author, not by the assistant.
