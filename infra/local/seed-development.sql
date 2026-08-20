BEGIN;

INSERT INTO orders (id, tenant_id, order_number, customer_id, currency, total_amount_minor, requested_delivery_date, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-2026-1001', '20000000-0000-0000-0000-000000000001', 'DKK', 4850000, current_date + 2, now() - interval '4 days'),
  ('10000000-0000-0000-0000-000000000002', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-2026-1002', '20000000-0000-0000-0000-000000000002', 'DKK', 2199000, current_date + 5, now() - interval '2 days'),
  ('10000000-0000-0000-0000-000000000003', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-2026-1003', '20000000-0000-0000-0000-000000000003', 'EUR', 764000, current_date + 8, now() - interval '1 day')
ON CONFLICT (id) DO UPDATE SET requested_delivery_date = EXCLUDED.requested_delivery_date;

INSERT INTO order_lines (order_id, line_number, sku, quantity, unit_price_minor)
VALUES
  ('10000000-0000-0000-0000-000000000001', 1, 'NF-SENSOR-01', 50, 97000),
  ('10000000-0000-0000-0000-000000000002', 1, 'NF-VALVE-08', 30, 73300),
  ('10000000-0000-0000-0000-000000000003', 1, 'NF-CABLE-15', 80, 9550)
ON CONFLICT (order_id, line_number) DO NOTHING;

INSERT INTO delay_predictions (tenant_id, order_id, delay_probability, model_version, scored_at)
VALUES
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', '10000000-0000-0000-0000-000000000001', 0.91, 'delay-risk-1.0.0', now() - interval '20 minutes'),
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', '10000000-0000-0000-0000-000000000002', 0.73, 'delay-risk-1.0.0', now() - interval '18 minutes'),
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', '10000000-0000-0000-0000-000000000003', 0.22, 'delay-risk-1.0.0', now() - interval '15 minutes')
ON CONFLICT (order_id) DO UPDATE SET delay_probability = EXCLUDED.delay_probability, scored_at = EXCLUDED.scored_at;

INSERT INTO inventory_status (tenant_id, sku, available_quantity, reserved_quantity, updated_at)
VALUES
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-SENSOR-01', 18, 42, now() - interval '8 minutes'),
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-VALVE-08', 65, 20, now() - interval '7 minutes'),
  ('414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'NF-CABLE-15', 74, 80, now() - interval '5 minutes')
ON CONFLICT (tenant_id, sku) DO UPDATE SET available_quantity = EXCLUDED.available_quantity, reserved_quantity = EXCLUDED.reserved_quantity, updated_at = EXCLUDED.updated_at;

INSERT INTO data_quality_runs (id, tenant_id, contract_version, processed_events, valid_events, quarantined_events, error_rate, evaluated_at)
VALUES ('30000000-0000-0000-0000-000000000001', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'order-created.v1', 1250, 1218, 32, 0.0256, now() - interval '10 minutes')
ON CONFLICT (id) DO UPDATE SET processed_events = EXCLUDED.processed_events, valid_events = EXCLUDED.valid_events, quarantined_events = EXCLUDED.quarantined_events, error_rate = EXCLUDED.error_rate, evaluated_at = EXCLUDED.evaluated_at;

INSERT INTO data_lineage_stages (run_id, stage_order, name, status, event_count, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 1, 'API ingestion', 'Healthy', 1250, now() - interval '12 minutes'),
  ('30000000-0000-0000-0000-000000000001', 2, 'Bronze', 'Healthy', 1250, now() - interval '11 minutes'),
  ('30000000-0000-0000-0000-000000000001', 3, 'Silver', 'Warning', 1218, now() - interval '10 minutes')
ON CONFLICT (run_id, stage_order) DO UPDATE SET status = EXCLUDED.status, event_count = EXCLUDED.event_count, updated_at = EXCLUDED.updated_at;

INSERT INTO data_contract_violations (run_id, rule, field, violation_count, severity, latest_event_id)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'required', 'customerId', 19, 'Critical', 'evt-demo-019'),
  ('30000000-0000-0000-0000-000000000001', 'positive', 'lines.quantity', 13, 'Warning', 'evt-demo-032')
ON CONFLICT (run_id, rule, field) DO UPDATE SET violation_count = EXCLUDED.violation_count, latest_event_id = EXCLUDED.latest_event_id;

INSERT INTO alert_rules (id, tenant_id, name, metric, threshold, unit, evaluation_window_minutes, severity, enabled)
VALUES ('40000000-0000-0000-0000-000000000001', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', 'High quarantine rate', 'quarantine_rate', 2.0, '%', 15, 'Critical', true)
ON CONFLICT (id) DO UPDATE SET threshold = EXCLUDED.threshold, enabled = EXCLUDED.enabled;

INSERT INTO operational_alerts (id, tenant_id, rule_id, title, source, severity, status, current_value, threshold, unit, owner, correlation_id, triggered_at)
VALUES ('50000000-0000-0000-0000-000000000001', '414ebb2a-4de5-462c-a8f4-ba16933c0a72', '40000000-0000-0000-0000-000000000001', 'Quarantine rate above threshold', 'Silver quality monitor', 'Critical', 'Open', 2.56, 2.0, '%', 'Data Operations', 'demo-correlation-001', now() - interval '9 minutes')
ON CONFLICT (id) DO UPDATE SET current_value = EXCLUDED.current_value, status = EXCLUDED.status, triggered_at = EXCLUDED.triggered_at;

COMMIT;
