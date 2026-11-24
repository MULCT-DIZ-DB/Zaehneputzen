"""Shared pytest fixtures: test server, iPad-like browser context, module harness."""
from __future__ import annotations

import sys
import threading
from pathlib import Path
from typing import Any, Callable, Iterator

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
import config  # noqa: E402
from serve import make_server  # noqa: E402


@pytest.fixture(scope="session")
def base_url() -> Iterator[str]:
    """Starts the app server on a free local port for the whole test session.

    Yields:
        Base URL such as ``http://127.0.0.1:54321``.
    """
    server = make_server(config.TEST_HOST, config.TEST_PORT)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    host, port = server.server_address[:2]
    yield f"http://{host}:{port}"
    server.shutdown()
    server.server_close()


@pytest.fixture(scope="session")
def browser_context_args(browser_context_args: dict[str, Any]) -> dict[str, Any]:
    """Configures every browser context to look like an iPad 5 in landscape.

    Args:
        browser_context_args: Defaults from pytest-playwright.

    Returns:
        Context arguments with viewport, touch support and German locale.
    """
    return {
        **browser_context_args,
        "viewport": config.IPAD_LANDSCAPE,
        "device_scale_factor": config.IPAD_SCALE_FACTOR,
        "has_touch": True,
        "locale": "de-DE",
        "timezone_id": "Europe/Berlin",
        "reduced_motion": "reduce",
    }


@pytest.fixture()
def harness(page, base_url: str):
    """Opens an empty same-origin page so ES modules from ``app/js`` can be imported.

    Args:
        page: Playwright page fixture.
        base_url: Test server URL.

    Returns:
        The page, ready for ``page.evaluate("import('./js/...')")`` calls.
    """
    page.route(
        f"{base_url}{config.HARNESS_PATH}",
        lambda route: route.fulfill(
            status=200, content_type="text/html", body="<!doctype html><meta charset='utf-8'><title>t</title>"
        ),
    )
    page.goto(f"{base_url}{config.HARNESS_PATH}")
    page.evaluate("localStorage.clear()")
    return page


@pytest.fixture()
def js(harness) -> Callable[..., Any]:
    """Returns a helper that runs a JS function body with app modules available.

    The body gets an object ``m`` with all logic modules (config, timer,
    storage, rewards, sequins, sketch, devmode, backup, playtime, songs, dancememory, piano, sugarhunt) and the call argument as ``arg``.

    Args:
        harness: Module harness page.

    Returns:
        ``run(body, arg=None)`` executing ``body`` and returning its result.
    """
    loader = """async ([body, arg]) => {
        const names = ['config', 'timer', 'storage', 'rewards', 'sequins', 'sketch', 'devmode', 'backup', 'playtime',
                       'songs', 'games/dancememory', 'games/piano', 'games/sugarhunt'];
        const m = {};
        for (const n of names) { m[n.split('/').pop()] = await import(`./js/${n}.js`); }
        const fn = new Function('m', 'arg', `return (async () => { ${body} })();`);
        return fn(m, arg);
    }"""

    def run(body: str, arg: Any = None) -> Any:
        """Executes ``body`` in the browser and returns the JSON-serialisable result."""
        return harness.evaluate(loader, [body, arg])

    return run


@pytest.fixture()
def app_page(page, base_url: str):
    """Opens the real app in fast mode with fresh storage and collects console errors.

    Args:
        page: Playwright page fixture.
        base_url: Test server URL.

    Returns:
        The page; console errors are available as ``page.console_errors``.
    """
    errors: list[str] = []
    page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.clock.install(time=config.TEST_CLOCK_START)
    page.goto(f"{base_url}/index.html")
    page.evaluate("document.fonts.ready.then(() => localStorage.clear())")  # don't abort the font download
    page.goto(f"{base_url}/index.html?schnell=1")
    page.wait_for_selector("#screen-start.active")
    page.console_errors = errors
    return page
