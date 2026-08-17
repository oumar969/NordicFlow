"""Passwordless Event Hubs (Kafka endpoint) to append-only Bronze ingestion."""

from pyspark.sql import DataFrame, SparkSession, functions as F

OAUTH_CALLBACK = "com.nordicflow.kafka.AzureIdentityCallbackHandler"


def kafka_options(
    namespace: str,
    event_hub: str,
    max_offsets_per_trigger: int = 10000,
    starting_offsets: str = "earliest",
) -> dict[str, str]:
    if not namespace or not event_hub:
        raise ValueError("Event Hubs namespace and event hub name are required")
    if max_offsets_per_trigger < 1:
        raise ValueError("max_offsets_per_trigger must be positive")
    return {
        "kafka.bootstrap.servers": f"{namespace}:9093",
        "subscribe": event_hub,
        "kafka.security.protocol": "SASL_SSL",
        "kafka.sasl.mechanism": "OAUTHBEARER",
        "kafka.sasl.jaas.config": (
            "org.apache.kafka.common.security.oauthbearer.OAuthBearerLoginModule "
            'required scope="https://eventhubs.azure.net/.default";'
        ),
        "kafka.sasl.login.callback.handler.class": OAUTH_CALLBACK,
        "startingOffsets": starting_offsets,
        "failOnDataLoss": "true",
        "includeHeaders": "true",
        "maxOffsetsPerTrigger": str(max_offsets_per_trigger),
    }


def to_bronze(kafka: DataFrame) -> DataFrame:
    """Preserve raw bytes and transport metadata without enforcing the contract."""
    header_map = F.map_from_entries(
        F.transform("headers", lambda header: F.struct(header.key, header.value.cast("string")))
    )
    raw_payload = F.col("value").cast("string")
    return kafka.select(
        raw_payload.alias("_raw_payload"),
        F.col("value").alias("_raw_bytes"),
        F.col("topic").alias("_source_topic"),
        F.col("partition").alias("_source_partition"),
        F.col("offset").alias("_source_offset"),
        F.col("timestamp").alias("_enqueued_at"),
        F.col("timestampType").alias("_timestamp_type"),
        header_map.alias("_application_properties"),
        F.coalesce(header_map["eventId"], F.get_json_object(raw_payload, "$.eventId")).alias("eventId"),
        F.coalesce(
            header_map["correlationId"], F.get_json_object(raw_payload, "$.correlationId")
        ).alias("correlationId"),
        F.coalesce(
            header_map["traceparent"], F.get_json_object(raw_payload, "$.traceParent")
        ).alias("traceparent"),
        F.coalesce(header_map["tenantId"], F.get_json_object(raw_payload, "$.tenantId")).alias(
            "tenantId"
        ),
        F.coalesce(header_map["eventType"], F.get_json_object(raw_payload, "$.eventType")).alias(
            "eventType"
        ),
        F.get_json_object(raw_payload, "$.schemaVersion").cast("int").alias("schemaVersion"),
        F.current_timestamp().alias("_ingested_at"),
    )


def run(
    spark: SparkSession,
    namespace: str,
    event_hub: str,
    bronze_table: str,
    checkpoint_location: str,
    max_offsets_per_trigger: int,
) -> None:
    source = spark.readStream.format("kafka").options(
        **kafka_options(namespace, event_hub, max_offsets_per_trigger)
    ).load()
    query = (
        to_bronze(source)
        .writeStream.format("delta")
        .outputMode("append")
        .option("checkpointLocation", checkpoint_location)
        .option("mergeSchema", "false")
        .queryName("nordicflow_event_hubs_to_bronze")
        .trigger(processingTime="10 seconds")
        .toTable(bronze_table)
    )
    query.awaitTermination()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--event-hubs-namespace", required=True)
    parser.add_argument("--event-hub-name", required=True)
    parser.add_argument("--bronze-table", required=True)
    parser.add_argument("--checkpoint-location", required=True)
    parser.add_argument("--max-offsets-per-trigger", type=int, default=10000)
    args = parser.parse_args()
    run(
        spark,  # noqa: F821
        args.event_hubs_namespace,
        args.event_hub_name,
        args.bronze_table,
        args.checkpoint_location,
        args.max_offsets_per_trigger,
    )
