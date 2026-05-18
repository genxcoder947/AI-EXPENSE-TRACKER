from __future__ import annotations

import signal
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    backend = subprocess.Popen([sys.executable, str(ROOT / "backend" / "server.py")], cwd=ROOT)
    frontend = subprocess.Popen(["npm", "run", "dev"], cwd=ROOT)
    processes = [backend, frontend]

    def stop_all() -> None:
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            if process.poll() is None:
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()

    def handle_signal(_signum: int, _frame: object) -> None:
        stop_all()
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    stop_all()
                    return code
            time.sleep(0.2)
    finally:
        stop_all()


if __name__ == "__main__":
    raise SystemExit(main())
