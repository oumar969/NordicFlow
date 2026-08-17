import sys
from pathlib import Path

import pytest
from pyspark.sql import SparkSession

sys.path.insert(0, str(Path(__file__).parents[1] / "silver"))


@pytest.fixture(scope="session")
def spark():
    session = SparkSession.builder.master("local[2]").appName("nordicflow-tests").getOrCreate()
    yield session
    session.stop()

