import pytest
import os

# Ensure tests use lightning-fast local SQLite
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_agentos.db"
os.environ["REQUIRE_AUTH"] = "False"

@pytest.fixture(autouse=True)
def cleanup_test_db():
    yield
    # Cleanup test db file after test run if desired
    if os.path.exists("./test_agentos.db"):
        try:
            os.remove("./test_agentos.db")
        except Exception:
            pass
