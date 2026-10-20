#!/usr/bin/env python3
"""Run Hermes Agent's plugin scanner against this repo, as `hermes plugins install` does.

Usage: python scripts/hermes-scan.py [--ref <hermes-agent git ref>]

Fetches the scanner modules from NousResearch/hermes-agent (default ref: main) into a
temp dir, scans the repo root, prints the verdict and every critical/high finding, and
exits 1 on a dangerous verdict. Needs Python 3.11+.
"""

import argparse
import sys
import tempfile
import urllib.request
from collections import Counter
from pathlib import Path

MODULES = ("skills_guard.py", "plugin_guard.py", "plugin_guard_context.py")
RAW_URL = "https://raw.githubusercontent.com/NousResearch/hermes-agent/{ref}/tools/{name}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ref", default="main")
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    sys.dont_write_bytecode = True
    repo = Path(__file__).resolve().parent.parent

    with tempfile.TemporaryDirectory() as tmp:
        pkg = Path(tmp) / "tools"
        pkg.mkdir()
        (pkg / "__init__.py").write_text("")
        for name in MODULES:
            with urllib.request.urlopen(RAW_URL.format(ref=args.ref, name=name), timeout=30) as resp:
                (pkg / name).write_bytes(resp.read())
        sys.path.insert(0, tmp)
        from tools.plugin_guard import scan_plugin, should_allow_plugin_install

        result = scan_plugin(repo, source="topia4hermes")

    _, reason = should_allow_plugin_install(result)
    print(f"verdict: {result.verdict} ({reason})")
    print("findings by severity:", dict(Counter(f.severity for f in result.findings)))
    for f in sorted(result.findings, key=lambda f: (f.severity != "critical", f.file, f.line)):
        if f.severity in ("critical", "high"):
            print(f"  {f.severity.upper():8} {f.pattern_id:30} {f.file}:{f.line}")
    return 1 if result.verdict == "dangerous" else 0


if __name__ == "__main__":
    sys.exit(main())
