"""CSV -> BGE-M3 embeddings -> Qdrant upsert.

Usage:
    uv run python -m app.ingest.ingest [--recreate] [--batch-size 32]
"""

import argparse
import csv
from pathlib import Path

from tqdm import tqdm

from app.services import embedding, qdrant_client

CSV_PATH = Path(__file__).parent.parent.parent.parent / "testcase" / "vwo_test_cases.csv"


def build_embedding_text(row: dict) -> str:
    return (
        f"Component: {row['Component/s']}\n"
        f"Summary: {row['Summary']}\n"
        f"Preconditions: {row['Preconditions']}\n"
        f"Test Steps: {row['Test Steps']}\n"
        f"Test Data: {row['Test Data']}\n"
        f"Expected Result: {row['Expected Result']}\n"
        f"Labels: {row['Labels']}"
    )


def scenario_type_from_labels(labels: str) -> str:
    parts = labels.split(";")
    return parts[2] if len(parts) >= 3 else ""


def load_rows() -> list[dict]:
    with CSV_PATH.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--recreate", action="store_true", help="Drop and recreate the collection first.")
    parser.add_argument("--batch-size", type=int, default=32)
    args = parser.parse_args()

    print(f"Loading rows from {CSV_PATH} ...")
    rows = load_rows()
    print(f"Loaded {len(rows)} rows.")

    qdrant_client.ensure_collection(recreate=args.recreate)

    for i in tqdm(range(0, len(rows), args.batch_size), desc="Ingesting"):
        batch = rows[i : i + args.batch_size]
        texts = [build_embedding_text(r) for r in batch]
        encoded = embedding.encode(texts)

        points = []
        for row, enc in zip(batch, encoded):
            key = row["Test Case Key"]
            payload = {
                "test_case_key": key,
                "issue_type": row["Issue Type"],
                "summary": row["Summary"],
                "priority": row["Priority"],
                "component": row["Component/s"],
                "labels": row["Labels"],
                "scenario_type": scenario_type_from_labels(row["Labels"]),
                "test_type": row["Test Type"],
                "automation_status": row["Automation Status"],
                "preconditions": row["Preconditions"],
                "test_steps": row["Test Steps"],
                "test_data": row["Test Data"],
                "expected_result": row["Expected Result"],
                "status": row["Status"],
            }
            points.append(
                {
                    "id": qdrant_client.point_id_for_key(key),
                    "dense": enc["dense"],
                    "sparse_indices": enc["sparse_indices"],
                    "sparse_values": enc["sparse_values"],
                    "payload": payload,
                }
            )
        qdrant_client.upsert_batch(points)

    count = qdrant_client.collection_stats()["total_points"]
    print(f"Done. Collection now has {count} points (expected {len(rows)}).")


if __name__ == "__main__":
    main()
