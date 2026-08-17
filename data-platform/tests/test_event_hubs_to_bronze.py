import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "bronze"))

from event_hubs_to_bronze import OAUTH_CALLBACK, kafka_options


def test_kafka_options_enforce_passwordless_tls_authentication():
    options = kafka_options("nf.servicebus.windows.net", "order-events", 500)

    assert options["kafka.security.protocol"] == "SASL_SSL"
    assert options["kafka.sasl.mechanism"] == "OAUTHBEARER"
    assert options["kafka.sasl.login.callback.handler.class"] == OAUTH_CALLBACK
    assert options["maxOffsetsPerTrigger"] == "500"
    assert not any("connectionstring" in value.lower() for value in options.values())


def test_kafka_options_reject_invalid_rate_limit():
    try:
        kafka_options("nf.servicebus.windows.net", "order-events", 0)
    except ValueError as error:
        assert "positive" in str(error)
    else:
        raise AssertionError("Expected ValueError")
