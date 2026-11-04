#!/usr/bin/env python3
"""Restricted SSH receiver; install root-owned at /usr/local/libexec/oqracam-deploy.py."""
import fcntl
import gzip
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import signal
import subprocess
import sys
import tarfile
import tempfile
import time

BASE = Path("/srv/oqracam/deploy")
OLD_SITE = Path("/srv/oqracam/site")
CURL = "/usr/bin/curl"
MAX_ARCHIVE = 32 * 1024 * 1024
MAX_EXPANDED = 64 * 1024 * 1024
MAX_FILES = 2000


def validate(directory, revision=None):
    if directory.is_symlink() or not directory.is_dir():
        raise ValueError("Release must be a regular directory")
    index = directory / "index.html"
    aasa = directory / ".well-known/apple-app-site-association"
    if index.is_symlink() or not index.is_file() or not index.stat().st_size:
        raise ValueError("Release is missing index.html")
    if aasa.is_symlink() or not isinstance(json.loads(aasa.read_text()), dict):
        raise ValueError("Release must contain an AASA JSON object")
    if revision and (directory / "deploy-revision.txt").read_text().strip() != revision:
        raise ValueError("Existing release has an unexpected revision")


def switch(target):
    temporary = BASE / f".current-{os.getpid()}"
    temporary.symlink_to(target)
    try:
        os.replace(temporary, BASE / "current")
    finally:
        temporary.unlink(missing_ok=True)


def healthy(revision):
    for attempt in range(3):
        try:
            result = subprocess.run([
                CURL, "--fail", "--silent", "--show-error", "--noproxy", "*",
                "--connect-timeout", "3", "--max-time", "8", "--max-filesize", "1024",
                "--resolve", "oqracam.com:443:127.0.0.1",
                f"https://oqracam.com/deploy-revision.txt?revision={revision}",
            ], capture_output=True, text=True, timeout=10)
            if result.returncode == 0 and result.stdout.strip() == revision:
                return True
        except subprocess.TimeoutExpired:
            pass
        if attempt < 2:
            time.sleep(1)
    return False


def main():
    command = re.fullmatch(r"deploy ([0-9a-f]{40})", os.environ.get("SSH_ORIGINAL_COMMAND", ""))
    if not command:
        raise ValueError("Only deploy followed by a 40-character Git commit hash is allowed")
    revision = command.group(1)
    releases = BASE / "releases"
    if BASE.is_symlink() or releases.is_symlink() or not releases.is_dir():
        raise ValueError("The deployment directories have not been prepared")
    with (BASE / ".deploy.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        current = BASE / "current"
        if not current.is_symlink():
            raise ValueError("The bootstrap current symlink is missing")
        previous = os.readlink(current)
        previous_path = (BASE / previous).resolve()
        if (previous_path != OLD_SITE.resolve() and not previous_path.is_relative_to(releases.resolve())) or not previous_path.is_dir():
            raise ValueError("The previous release is not an allowed release directory")
        payload = sys.stdin.buffer.read(MAX_ARCHIVE + 1)
        if len(payload) > MAX_ARCHIVE:
            raise ValueError("Compressed archive exceeds 32 MiB")
        with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
            unpacked = compressed.read(MAX_EXPANDED + 1)
        if len(unpacked) > MAX_EXPANDED:
            raise ValueError("Expanded archive exceeds 64 MiB")

        stage = Path(tempfile.mkdtemp(prefix=f".incoming-{revision}-", dir=releases))
        switched = False
        try:
            with tarfile.open(fileobj=io.BytesIO(unpacked), mode="r:") as archive:
                count, total = 0, 0
                seen = set()
                for member in archive:
                    count += 1
                    total += member.size
                    path = PurePosixPath(member.name)
                    if count > MAX_FILES or total > MAX_EXPANDED:
                        raise ValueError("Archive exceeds file-count or expanded-size limit")
                    if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE) or member.sparse:
                        raise ValueError("Only regular files and directories are allowed")
                    if path.is_absolute() or ".." in path.parts or not re.fullmatch(r"[A-Za-z0-9._/-]+", member.name):
                        raise ValueError("Unsafe archive path")
                    if str(path) in seen:
                        raise ValueError("Duplicate archive path")
                    seen.add(str(path))
                    archive.extract(member, stage, filter="data")
            validate(stage)
            (stage / "deploy-revision.txt").write_text(revision + "\n")
            for item in [stage, *stage.rglob("*")]:
                item.chmod(0o755 if item.is_dir() else 0o644)
            release = releases / revision
            if release.exists() or release.is_symlink():
                validate(release, revision)
                shutil.rmtree(stage)
            else:
                stage.rename(release)
            stage = None
            switched = True
            switch(f"releases/{revision}")
            if not healthy(revision):
                raise RuntimeError("HTTPS health check failed")
            print(f"Deployed {revision}")
        except BaseException:
            if switched:
                switch(previous)
                print("Restored the previous release", file=sys.stderr)
            raise
        finally:
            if stage is not None:
                shutil.rmtree(stage)


def interrupted(number, frame):
    raise InterruptedError(f"Deployment interrupted by signal {number}")


if __name__ == "__main__":
    for event in (signal.SIGTERM, signal.SIGHUP, signal.SIGALRM):
        signal.signal(event, interrupted)
    signal.alarm(180)
    try:
        main()
    except Exception as error:
        print(f"Deployment failed: {error}", file=sys.stderr)
        sys.exit(1)
