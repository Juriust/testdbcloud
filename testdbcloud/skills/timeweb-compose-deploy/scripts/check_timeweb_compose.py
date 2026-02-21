#!/usr/bin/env python3
"""Fast compatibility checks for Timeweb App Platform Docker Compose deploys."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

BANNED_DIRECTIVES = (
    "cap_add",
    "cgroup",
    "cgroup_parent",
    "devices",
    "privileged",
    "device_cgroup_rules",
    "volumes",
    "ipc",
    "pid",
    "security_opt",
    "userns_mode",
    "sysctls",
)
FORBIDDEN_HOST_PORTS = {80, 443}


@dataclass
class Finding:
    level: str
    message: str
    line: int | None = None


def is_blank_or_comment(line: str) -> bool:
    stripped = line.strip()
    return not stripped or stripped.startswith("#")


def indent_of(line: str) -> int:
    return len(line) - len(line.lstrip(" "))


def parse_host_port(short_mapping: str) -> int | None:
    value = short_mapping.strip().split("/", 1)[0]
    if "${" in value:
        return None

    # Matches "8080:80" and "127.0.0.1:8080:80".
    match = re.match(r'^(?:(?:\[[^\]]+\]|[^:]+):)?(\d+):(\d+)$', value)
    if not match:
        return None
    return int(match.group(1))


def check_banned_directives(lines: list[str], findings: list[Finding]) -> None:
    for directive in BANNED_DIRECTIVES:
        pattern = re.compile(rf"^\s*{re.escape(directive)}\s*:")
        for line_no, line in enumerate(lines, start=1):
            if is_blank_or_comment(line):
                continue
            if pattern.search(line):
                findings.append(
                    Finding(
                        level="ERROR",
                        message=f"Forbidden directive `{directive}` is not allowed by Timeweb.",
                        line=line_no,
                    )
                )


def check_network_mode(lines: list[str], findings: list[Finding]) -> None:
    pattern = re.compile(r'^\s*network_mode\s*:\s*["\']?host["\']?\s*$')
    for line_no, line in enumerate(lines, start=1):
        if is_blank_or_comment(line):
            continue
        if pattern.search(line):
            findings.append(
                Finding(
                    level="ERROR",
                    message="`network_mode: host` is not supported by Timeweb.",
                    line=line_no,
                )
            )


def check_ports(lines: list[str], findings: list[Finding]) -> None:
    in_ports_block = False
    ports_indent = -1

    for line_no, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        indent = indent_of(line)

        if in_ports_block and indent <= ports_indent and stripped:
            in_ports_block = False

        if re.match(r"^\s*ports\s*:\s*$", line):
            in_ports_block = True
            ports_indent = indent
            continue

        if not in_ports_block:
            continue

        short_match = re.match(r'^\s*-\s*["\']?([^"\']+)["\']?\s*(?:#.*)?$', line)
        if short_match:
            host_port = parse_host_port(short_match.group(1))
            if host_port in FORBIDDEN_HOST_PORTS:
                findings.append(
                    Finding(
                        level="ERROR",
                        message=f"Host port `{host_port}` is reserved by platform web server.",
                        line=line_no,
                    )
                )
            continue

        published_match = re.match(r'^\s*published\s*:\s*["\']?(\d+)["\']?\s*$', line)
        if published_match:
            host_port = int(published_match.group(1))
            if host_port in FORBIDDEN_HOST_PORTS:
                findings.append(
                    Finding(
                        level="ERROR",
                        message=f"Host port `{host_port}` is reserved by platform web server.",
                        line=line_no,
                    )
                )


def detect_first_service(lines: list[str]) -> tuple[str | None, int | None, int | None]:
    services_indent = None
    start_index = None

    for idx, line in enumerate(lines):
        if is_blank_or_comment(line):
            continue
        services_match = re.match(r"^(\s*)services\s*:\s*$", line)
        if services_match:
            services_indent = len(services_match.group(1))
            start_index = idx + 1
            break

    if services_indent is None or start_index is None:
        return None, None, None

    for idx in range(start_index, len(lines)):
        line = lines[idx]
        if is_blank_or_comment(line):
            continue
        indent = indent_of(line)
        if indent <= services_indent:
            break
        service_match = re.match(r"^(\s*)([A-Za-z0-9_.-]+)\s*:\s*$", line)
        if service_match:
            return service_match.group(2), len(service_match.group(1)), idx

    return None, None, None


def first_service_has_ports(lines: list[str], service_indent: int, service_index: int) -> bool:
    for idx in range(service_index + 1, len(lines)):
        line = lines[idx]
        if is_blank_or_comment(line):
            continue

        indent = indent_of(line)
        next_service = re.match(r"^(\s*)([A-Za-z0-9_.-]+)\s*:\s*$", line)
        if next_service and len(next_service.group(1)) == service_indent:
            break
        if indent <= service_indent:
            break
        if re.match(r"^\s*ports\s*:\s*$", line):
            return True
    return False


def check_layout(lines: list[str], compose_path: Path, findings: list[Finding]) -> None:
    if compose_path.name != "docker-compose.yml":
        findings.append(
            Finding(
                level="WARN",
                message=(
                    "Timeweb docs expect `docker-compose.yml` in repository root. "
                    f"Current file name is `{compose_path.name}`."
                ),
            )
        )

    uses_build = any(
        re.match(r"^\s*build\s*:", line)
        for line in lines
        if not is_blank_or_comment(line)
    )
    has_dockerfile_key = any(
        re.match(r"^\s*dockerfile\s*:", line)
        for line in lines
        if not is_blank_or_comment(line)
    )
    dockerfile_in_same_dir = (compose_path.parent / "Dockerfile").exists()

    if uses_build and not dockerfile_in_same_dir and not has_dockerfile_key:
        findings.append(
            Finding(
                level="WARN",
                message=(
                    "No root Dockerfile found and no explicit `build.dockerfile` found. "
                    "Set `build.dockerfile` when Dockerfile is not in repository root."
                ),
            )
        )


def check_first_service(lines: list[str], findings: list[Finding]) -> None:
    service_name, service_indent, service_index = detect_first_service(lines)
    if not service_name:
        findings.append(
            Finding(
                level="WARN",
                message="Unable to detect first service under `services:` block.",
            )
        )
        return

    if not first_service_has_ports(lines, service_indent, service_index):
        findings.append(
            Finding(
                level="WARN",
                message=(
                    f"First service `{service_name}` has no `ports` block. "
                    "Primary app is usually expected to expose a port."
                ),
            )
        )


def run_checks(compose_path: Path) -> tuple[list[Finding], list[Finding]]:
    lines = compose_path.read_text(encoding="utf-8").splitlines()
    findings: list[Finding] = []

    check_banned_directives(lines, findings)
    check_network_mode(lines, findings)
    check_ports(lines, findings)
    check_layout(lines, compose_path, findings)
    check_first_service(lines, findings)

    errors = [item for item in findings if item.level == "ERROR"]
    warnings = [item for item in findings if item.level == "WARN"]
    return errors, warnings


def print_findings(errors: list[Finding], warnings: list[Finding]) -> None:
    if errors:
        print("[FAIL] Blocking issues found:")
        for item in errors:
            location = f"line {item.line}: " if item.line else ""
            print(f"- {location}{item.message}")
    else:
        print("[OK] No blocking issues found.")

    if warnings:
        print("\n[WARN] Non-blocking checks:")
        for item in warnings:
            location = f"line {item.line}: " if item.line else ""
            print(f"- {location}{item.message}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Check Docker Compose compatibility with Timeweb App Platform rules."
    )
    parser.add_argument(
        "compose_file",
        nargs="?",
        default="docker-compose.yml",
        help="Path to docker-compose file (default: docker-compose.yml).",
    )
    args = parser.parse_args()

    compose_path = Path(args.compose_file).resolve()
    if not compose_path.exists():
        print(f"[ERROR] Compose file not found: {compose_path}")
        return 2
    if not compose_path.is_file():
        print(f"[ERROR] Not a file: {compose_path}")
        return 2

    errors, warnings = run_checks(compose_path)
    print_findings(errors, warnings)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
