"""Fail a Databricks task when recent quarantine rate breaches its threshold."""

from datetime import timedelta
from pyspark.sql import SparkSession, functions as F


def assert_quarantine_rate(
    spark: SparkSession, bronze_table: str, quarantine_table: str, window_minutes: int, threshold: float
) -> None:
    since = F.current_timestamp() - F.expr(f"INTERVAL {window_minutes} MINUTES")
    incoming = spark.table(bronze_table).filter(F.col("_ingested_at") >= since).count()
    rejected = spark.table(quarantine_table).filter(F.col("_quarantined_at") >= since).count()
    rate = rejected / incoming if incoming else 0.0
    spark.createDataFrame([(incoming, rejected, rate)], "incoming long, rejected long, quarantine_rate double").show()
    if incoming > 0 and rate >= threshold:
        raise RuntimeError(f"Quarantine rate {rate:.2%} breaches threshold {threshold:.2%}")


if __name__ == "__main__":
    assert_quarantine_rate(
        spark,
        dbutils.widgets.get("bronze_table"),
        dbutils.widgets.get("quarantine_table"),
        int(dbutils.widgets.get("window_minutes")),
        float(dbutils.widgets.get("threshold")),
    )  # noqa: F821

