"""Build a point-in-time Gold feature table for delay prediction."""

from delta.tables import DeltaTable
from pyspark.sql import SparkSession, functions as F


def build_features(
    spark: SparkSession, silver_orders: str, silver_deliveries: str, gold_features: str
) -> None:
    orders = spark.table(silver_orders)
    deliveries = spark.table(silver_deliveries).select(
        "order_id", F.to_date("actual_delivery_at").alias("actual_delivery_date")
    )
    features = (
        orders.select(
            F.col("data.orderId").alias("order_id"),
            F.col("tenantId").alias("tenant_id"),
            F.col("occurred_at").alias("feature_timestamp"),
            F.col("data.customerId").alias("customer_id"),
            F.col("data.currency").alias("currency"),
            F.col("data.totalAmountMinor").alias("total_amount_minor"),
            F.size("data.lines").alias("line_count"),
            F.aggregate("data.lines", F.lit(0.0), lambda acc, line: acc + line.quantity).alias("total_quantity"),
            F.datediff("data.requestedDeliveryDate", F.to_date("occurred_at")).alias("requested_lead_days"),
            F.dayofweek("occurred_at").alias("order_day_of_week"),
            F.col("_lineage_event_id"),
            F.col("_lineage_correlation_id"),
        )
        .join(deliveries, "order_id", "inner")
        .filter(F.col("requested_lead_days") >= 0)
        .withColumn(
            "is_delayed",
            (F.col("actual_delivery_date") > F.date_add(F.to_date("feature_timestamp"), F.col("requested_lead_days"))).cast("int"),
        )
        .drop("actual_delivery_date")
        .withColumn("_gold_processed_at", F.current_timestamp())
    )

    if not spark.catalog.tableExists(gold_features):
        features.write.format("delta").partitionBy("tenant_id").saveAsTable(gold_features)
        return
    DeltaTable.forName(spark, gold_features).alias("t").merge(
        features.alias("s"), "t.order_id = s.order_id"
    ).whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()


if __name__ == "__main__":
    build_features(
        spark,
        dbutils.widgets.get("silver_orders"),
        dbutils.widgets.get("silver_deliveries"),
        dbutils.widgets.get("gold_features"),
    )  # noqa: F821
