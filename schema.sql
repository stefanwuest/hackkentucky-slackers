DROP TABLE IF EXISTS schedule_a;
DROP TABLE IF EXISTS form_5500;

CREATE TABLE form_5500 (
  ackId TEXT PRIMARY KEY,
  ein TEXT NOT NULL,
  sponsorName TEXT,
  planName TEXT,
  planYearBegin TEXT,
  taxPeriod TEXT,
  activeParticipants INTEGER,
  businessCode TEXT,
  city TEXT,
  state TEXT
);

CREATE INDEX idx_form_5500_ein
  ON form_5500(ein);

CREATE INDEX idx_form_5500_sponsor
  ON form_5500(sponsorName);

CREATE TABLE schedule_a (
  ackId TEXT,
  ein TEXT,
  carrierName TEXT,
  personsCovered INTEGER,
  policyFrom TEXT,
  policyTo TEXT,
  earnedPremium REAL,
  brokerCommission REAL,
  benefits TEXT
);

CREATE INDEX idx_schedule_a_ack_id
  ON schedule_a(ackId);

CREATE INDEX idx_schedule_a_ein
  ON schedule_a(ein);