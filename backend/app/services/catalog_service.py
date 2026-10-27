import json
import sqlite3
import uuid
from datetime import datetime

from app.config import settings
from app.models.garment import GarmentCategory, GarmentCreate, GarmentResponse, GarmentUpdate


class CatalogService:
    def __init__(self, db_path: str | None = None):
        self.db_path = settings.resolve_path(db_path or settings.DATABASE_PATH)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS garments (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    image_url TEXT NOT NULL,
                    cutout_url TEXT,
                    anchor_hints TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_garments_category ON garments(category)")
            conn.commit()

    def list_garments(
        self,
        category: GarmentCategory | None = None,
        query: str | None = None
    ) -> list[GarmentResponse]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            sql = "SELECT * FROM garments WHERE 1=1"
            params = []

            if category:
                sql += " AND category = ?"
                params.append(category.value)
            
            if query:
                sql += " AND (name LIKE ? OR description LIKE ?)"
                wildcard = f"%{query.strip()}%"
                params.extend([wildcard, wildcard])

            sql += " ORDER BY created_at DESC"
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            return [self._row_to_response(row) for row in rows]

    def get_garment(self, garment_id: str) -> GarmentResponse | None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM garments WHERE id = ?", (garment_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_response(row)

    def create_garment(
        self,
        data: GarmentCreate,
        image_url: str,
        cutout_url: str | None = None
    ) -> GarmentResponse:
        garment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        anchor_hints_json = json.dumps(data.anchor_hints or {})

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO garments (id, name, category, description, image_url, cutout_url, anchor_hints, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                garment_id,
                data.name,
                data.category.value,
                data.description or "",
                image_url,
                cutout_url,
                anchor_hints_json,
                now,
                now
            ))
            conn.commit()

        return self.get_garment(garment_id)

    def update_garment(
        self,
        garment_id: str,
        data: GarmentUpdate,
        image_url: str | None = None,
        cutout_url: str | None = None
    ) -> GarmentResponse | None:
        existing = self.get_garment(garment_id)
        if not existing:
            return None

        now = datetime.utcnow().isoformat()
        updates = []
        params = []

        if data.name is not None:
            updates.append("name = ?")
            params.append(data.name)
        if data.category is not None:
            updates.append("category = ?")
            params.append(data.category.value)
        if data.description is not None:
            updates.append("description = ?")
            params.append(data.description)
        if data.anchor_hints is not None:
            updates.append("anchor_hints = ?")
            params.append(json.dumps(data.anchor_hints))
        if image_url is not None:
            updates.append("image_url = ?")
            params.append(image_url)
        if cutout_url is not None:
            updates.append("cutout_url = ?")
            params.append(cutout_url)

        if not updates:
            return existing

        updates.append("updated_at = ?")
        params.append(now)
        params.append(garment_id)

        sql = f"UPDATE garments SET {', '.join(updates)} WHERE id = ?"
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            conn.commit()

        return self.get_garment(garment_id)

    def delete_garment(self, garment_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM garments WHERE id = ?", (garment_id,))
            conn.commit()
            return cursor.rowcount > 0

    def _row_to_response(self, row: sqlite3.Row) -> GarmentResponse:
        try:
            hints = json.loads(row["anchor_hints"]) if row["anchor_hints"] else {}
        except Exception:
            hints = {}

        return GarmentResponse(
            id=row["id"],
            name=row["name"],
            category=GarmentCategory(row["category"]),
            description=row["description"],
            image_url=row["image_url"],
            cutout_url=row["cutout_url"],
            anchor_hints=hints,
            created_at=row["created_at"],
            updated_at=row["updated_at"]
        )


catalog_service = CatalogService()
