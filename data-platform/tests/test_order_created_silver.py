import json

from order_created_silver import prepare_valid, with_quality_results


def event(event_id: str, *, currency: str = "DKK", quantity: float = 1.0) -> str:
    return json.dumps({
        "eventId": event_id,
        "eventType": "nordicflow.order.created.v1",
        "schemaVersion": 1,
        "occurredAt": "2026-08-17T09:15:00Z",
        "source": "test-suite",
        "tenantId": "d635537b-a663-4859-9a3e-3f4d51ab80af",
        "correlationId": "64823913-9f9a-4cf3-b8b7-2d7216e37994",
        "data": {
            "orderId": "b3f0fe7d-44ce-4330-a742-a23ade3209d3",
            "orderNumber": "ORDER-1",
            "customerId": "fe903087-9d82-46b4-b780-55b785b87c69",
            "currency": currency,
            "totalAmountMinor": 100,
            "lines": [{"lineNumber": 1, "sku": "SKU-1", "quantity": quantity, "unitPriceMinor": 100}],
        },
    })


def test_dirty_rows_receive_exact_quality_codes(spark):
    frame = spark.read.json(spark.sparkContext.parallelize([
        event("f69297c9-7603-4c8b-8988-59bd8b407ee7", currency="dkk", quantity=0),
    ]))

    errors = with_quality_results(frame).select("_quality_errors").first()[0]

    assert set(errors) == {"INVALID_CURRENCY", "INVALID_QUANTITY"}


def test_valid_rows_are_deduplicated_by_event_id(spark):
    event_id = "f69297c9-7603-4c8b-8988-59bd8b407ee7"
    frame = spark.read.json(spark.sparkContext.parallelize([event(event_id), event(event_id)]))

    valid = prepare_valid(with_quality_results(frame))

    assert valid.count() == 1
    assert valid.first()["_lineage_event_id"] == event_id

