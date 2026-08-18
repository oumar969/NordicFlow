CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    order_number varchar(50) NOT NULL,
    customer_id uuid NOT NULL,
    currency char(3) NOT NULL,
    total_amount_minor bigint NOT NULL CHECK (total_amount_minor >= 0),
    requested_delivery_date date NULL,
    created_at timestamptz NOT NULL,
    UNIQUE (tenant_id, order_number)
);

CREATE TABLE IF NOT EXISTS order_lines (
    order_id uuid NOT NULL REFERENCES orders(id),
    line_number integer NOT NULL CHECK (line_number > 0),
    sku varchar(100) NOT NULL,
    quantity numeric(18, 6) NOT NULL CHECK (quantity > 0),
    unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
    PRIMARY KEY (order_id, line_number)
);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id uuid PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES orders(id),
    processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_orders_tenant_created_at
    ON orders (tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS outbox_messages (
    id uuid PRIMARY KEY,
    event_type varchar(200) NOT NULL,
    tenant_id uuid NOT NULL,
    correlation_id uuid NULL,
    trace_parent varchar(100) NULL,
    payload jsonb NOT NULL,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz NULL,
    locked_until timestamptz NULL,
    attempts integer NOT NULL DEFAULT 0,
    last_error varchar(2000) NULL
);

CREATE INDEX IF NOT EXISTS ix_outbox_unpublished
    ON outbox_messages (occurred_at)
    WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS delay_predictions (
    tenant_id uuid NOT NULL,
    order_id uuid PRIMARY KEY,
    delay_probability numeric(6, 5) NOT NULL CHECK (delay_probability BETWEEN 0 AND 1),
    model_version varchar(100) NOT NULL,
    scored_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_status (
    tenant_id uuid NOT NULL,
    sku varchar(100) NOT NULL,
    available_quantity numeric(18, 6) NOT NULL,
    reserved_quantity numeric(18, 6) NOT NULL,
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (tenant_id, sku)
);

CREATE OR REPLACE VIEW dashboard_delay_predictions AS
SELECT p.tenant_id, p.order_id, o.order_number, p.delay_probability, p.scored_at
FROM delay_predictions p
JOIN orders o ON o.id = p.order_id AND o.tenant_id = p.tenant_id;

CREATE OR REPLACE VIEW dashboard_inventory_status AS
SELECT tenant_id, sku, available_quantity, reserved_quantity, updated_at
FROM inventory_status;

CREATE TABLE IF NOT EXISTS data_quality_runs (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    contract_version varchar(100) NOT NULL,
    processed_events bigint NOT NULL CHECK (processed_events >= 0),
    valid_events bigint NOT NULL CHECK (valid_events >= 0),
    quarantined_events bigint NOT NULL CHECK (quarantined_events >= 0),
    error_rate double precision NOT NULL CHECK (error_rate BETWEEN 0 AND 1),
    evaluated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_data_quality_runs_tenant_evaluated
    ON data_quality_runs (tenant_id, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS data_lineage_stages (
    run_id uuid NOT NULL REFERENCES data_quality_runs(id) ON DELETE CASCADE,
    stage_order integer NOT NULL CHECK (stage_order > 0),
    name varchar(100) NOT NULL,
    status varchar(20) NOT NULL CHECK (status IN ('Healthy', 'Warning', 'Failed')),
    event_count bigint NOT NULL CHECK (event_count >= 0),
    updated_at timestamptz NOT NULL,
    PRIMARY KEY (run_id, stage_order)
);

CREATE TABLE IF NOT EXISTS data_contract_violations (
    run_id uuid NOT NULL REFERENCES data_quality_runs(id) ON DELETE CASCADE,
    rule varchar(100) NOT NULL,
    field varchar(200) NOT NULL,
    violation_count bigint NOT NULL CHECK (violation_count >= 0),
    severity varchar(20) NOT NULL CHECK (severity IN ('Critical', 'Warning')),
    latest_event_id varchar(100) NOT NULL,
    PRIMARY KEY (run_id, rule, field)
);

CREATE TABLE IF NOT EXISTS alert_rules (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    name varchar(150) NOT NULL,
    metric varchar(150) NOT NULL,
    threshold double precision NOT NULL,
    unit varchar(20) NOT NULL,
    evaluation_window_minutes integer NOT NULL CHECK (evaluation_window_minutes > 0),
    severity varchar(20) NOT NULL CHECK (severity IN ('Critical', 'Warning', 'Info')),
    enabled boolean NOT NULL DEFAULT true,
    UNIQUE (tenant_id, metric)
);

CREATE TABLE IF NOT EXISTS operational_alerts (
    id uuid PRIMARY KEY,
    tenant_id uuid NOT NULL,
    rule_id uuid NULL REFERENCES alert_rules(id),
    title varchar(200) NOT NULL,
    source varchar(150) NOT NULL,
    severity varchar(20) NOT NULL CHECK (severity IN ('Critical', 'Warning', 'Info')),
    status varchar(20) NOT NULL CHECK (status IN ('Open', 'Acknowledged', 'Resolved')),
    current_value double precision NOT NULL,
    threshold double precision NOT NULL,
    unit varchar(20) NOT NULL,
    owner varchar(150) NULL,
    correlation_id varchar(128) NULL,
    triggered_at timestamptz NOT NULL,
    acknowledged_at timestamptz NULL,
    resolved_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS ix_operational_alerts_tenant_status_triggered
    ON operational_alerts (tenant_id, status, triggered_at DESC);
