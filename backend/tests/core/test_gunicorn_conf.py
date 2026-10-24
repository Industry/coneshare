import os
import runpy
from pathlib import Path
from unittest.mock import patch

import pytest

GUNICORN_CONF_PATH = (
    Path(__file__).resolve().parent.parent.parent / "docker.dist" / "runtime" / "gunicorn.conf.py"
)


def run_gunicorn_conf(env=None):
    """Executes gunicorn.conf.py and returns its namespace dict."""
    with patch.dict(os.environ, env or {}, clear=False):
        return runpy.run_path(str(GUNICORN_CONF_PATH))


def test_gunicorn_workers_default_conservative():
    """Verify that worker count defaults to 2 when no env var is set."""
    with patch.dict(os.environ, {}, clear=True):
        cfg = run_gunicorn_conf({})
        assert cfg["workers"] == 2


def test_gunicorn_workers_env_var_override():
    """Verify that GUNICORN_WORKERS environment variable takes precedence."""
    cfg = run_gunicorn_conf({"GUNICORN_WORKERS": "5"})
    assert cfg["workers"] == 5


def test_invalid_worker_env_var_fallback():
    """Verify that invalid non-numeric GUNICORN_WORKERS falls back to default 2."""
    cfg = run_gunicorn_conf({"GUNICORN_WORKERS": "invalid"})
    assert cfg["workers"] == 2


def test_gunicorn_threads_env_var():
    """Verify that GUNICORN_THREADS is respected, falling back to 2."""
    cfg_custom = run_gunicorn_conf({"GUNICORN_THREADS": "4"})
    assert cfg_custom["threads"] == 4

    with patch.dict(os.environ, {}, clear=True):
        cfg_default = run_gunicorn_conf({})
        assert cfg_default["threads"] == 2


def test_gunicorn_worker_recycling():
    """Verify max_requests and max_requests_jitter are configured for container memory leak prevention."""
    cfg = run_gunicorn_conf({})
    assert cfg["max_requests"] == 1000
    assert cfg["max_requests_jitter"] == 50
