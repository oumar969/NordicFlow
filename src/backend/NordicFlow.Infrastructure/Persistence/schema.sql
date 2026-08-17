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
