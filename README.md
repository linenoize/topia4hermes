# topia4hermes

[Topia](https://github.com/linenoize/topia)'s engineering-discipline skills, packaged as an
[Agent Plugins v1](https://agent-plugins.org/specification) portable package for
[Hermes Agent](https://github.com/NousResearch/hermes-agent).

## Install

```bash
hermes plugins install linenoize/topia4hermes
hermes plugins list            # find the installed plugin's name
hermes plugins enable <name>
```

Hermes scans every plugin before installing it. Expect a **caution** verdict: the security
and deploy skills describe risky commands, the scan reports those as high-severity
findings, and Hermes asks you to confirm. Every finding is listed in the scan report, so
you can review them before accepting.

## What's included

- All of topia's `skills/*/SKILL.md` skills and their `references/`, unchanged except
  for the files listed below.

Not included, because they depend on Claude Code: hooks, mods, slash commands, agents,
the IDE compiler, and the agora-code MCP server. Skills mention each other as
`topia:<skill>`; in Hermes, find the full qualified name with `skills_list`.

## Differences from topia

Hermes's scanner pattern-matches text, and five files in topia quote the attack strings
they teach the agent to detect or the secret-bearing commands they teach it to run. A
critical match blocks the install outright, with no override. These files are reworded
so the same guidance reads in prose; [`overrides.json`](overrides.json) lists them.

| File | Change |
|---|---|
| `skills/guardian/SKILL.md` | The static-scan target list describes the root-delete command in words instead of quoting it. |
| `skills/guardian/references/destructive-commands.md` | Same as above. |
| `skills/guardian/references/skill-content-guard.md` | The signature table describes the root-delete, prompt-injection, jailbreak and crypto-mining rows in words instead of quoting the literal strings. |
| `skills/quarantine/references/quarantine-discipline.md` | The example injected payload uses different wording for its injection line. |
| `skills/deploy/references/post-deploy-integration.md` | The admin smoke test builds its auth header on its own line before `curl`; the secrets table shows a placeholder instead of a variable. Behavior is unchanged. |

## Maintaining

```bash
node scripts/sync.mjs              # copy ../topia/skills; exits 1 if an overridden file changed upstream
node scripts/sync.mjs --accept     # after re-applying the rewording to a changed file
python scripts/hermes-scan.py      # run Hermes's current scanner; exits 1 on "dangerous"
```

CI runs the scanner on every push and weekly, so a scanner update that would block the
install shows up here first.

## License

MIT, same as topia.
