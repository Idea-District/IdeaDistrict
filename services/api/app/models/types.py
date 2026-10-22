from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# jsonb on Postgres (indexable), plain JSON on SQLite for the local demo.
JSONType = JSON().with_variant(JSONB(), "postgresql")
