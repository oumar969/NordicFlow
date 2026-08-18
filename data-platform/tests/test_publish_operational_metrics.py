import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "monitoring"))

from publish_operational_metrics import TenantQuality, collect_tenant_quality


def test_collect_tenant_quality_keeps_aggregates_tenant_scoped(spark):
    checked = spark.createDataFrame([
        ("d635537b-a663-4859-9a3e-3f4d51ab80af", []),
        ("d635537b-a663-4859-9a3e-3f4d51ab80af", ["INVALID_CURRENCY"]),
        ("b325a759-cffd-4140-8ec5-e4afbe8f981f", []),
        ("not-a-tenant", ["INVALID_TENANT_ID"]),
    ], "tenantId string, _quality_errors array<string>")

    quality = sorted(collect_tenant_quality(checked), key=lambda item: item.tenant_id)

    assert quality == [
        TenantQuality("b325a759-cffd-4140-8ec5-e4afbe8f981f", 1, 1, 0),
        TenantQuality("d635537b-a663-4859-9a3e-3f4d51ab80af", 2, 1, 1),
    ]
    assert quality[1].error_rate == 0.5


def test_tenant_quality_handles_empty_processing_window():
    assert TenantQuality("d635537b-a663-4859-9a3e-3f4d51ab80af", 0, 0, 0).error_rate == 0
