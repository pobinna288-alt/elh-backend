-- Enterprise Chat MVP schema
-- Simple, scalable structure for enterprise contact + admin chat flows.

CREATE TABLE IF NOT EXISTS enterprise_leads (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    company_name VARCHAR(120) NOT NULL,
    contact_email VARCHAR(160),
    contact_phone VARCHAR(40),
    budget NUMERIC(14, 2) NOT NULL,
    budget_range VARCHAR(40) NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('STANDARD', 'PRIORITY', 'VIP')),
    response_time_expectation VARCHAR(40) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enterprise_chats (
    id UUID PRIMARY KEY,
    enterprise_lead_id UUID NOT NULL REFERENCES enterprise_leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    last_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (enterprise_lead_id)
);

CREATE TABLE IF NOT EXISTS enterprise_messages (
    id UUID PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES enterprise_chats(id) ON DELETE CASCADE,
    sender_id UUID,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('ADMIN', 'CLIENT', 'SYSTEM')),
    message TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_status BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_enterprise_leads_user_status ON enterprise_leads(user_id, status);
CREATE INDEX IF NOT EXISTS idx_enterprise_leads_tier_status ON enterprise_leads(tier, status);
CREATE INDEX IF NOT EXISTS idx_enterprise_chats_updated_at ON enterprise_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_enterprise_messages_chat_time ON enterprise_messages(chat_id, timestamp ASC);
