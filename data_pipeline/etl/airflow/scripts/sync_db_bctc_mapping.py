import json
import os
import sys
import argparse
from pathlib import Path
import psycopg2

def get_db_connection(db_url: str):
    """Establishes connection to the Postgres database."""
    # Clean scheme for psycopg2
    if db_url.startswith("postgresql+psycopg2://"):
        db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")
    elif db_url.startswith("postgres+psycopg2://"):
        db_url = db_url.replace("postgres+psycopg2://", "postgresql://")
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://")
        
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"[ERROR] Error connecting to database: {e}")
        sys.exit(1)

def main():
    # Force standard output to UTF-8 to handle Vietnamese characters on Windows terminal
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        
    parser = argparse.ArgumentParser(description="Delete BCTC records with invalid ind_codes not present in mapping file.")
    parser.add_argument(
        "--db-url",
        default=os.environ.get("DWH_DB_URL", "postgresql://admin:123456@localhost:5432/postgres"),
        help="Postgres connection string."
    )
    parser.add_argument(
        "--schema",
        default=os.environ.get("DWH_SCHEMA", "hethong_phantich_chungkhoan"),
        help="Database schema name."
    )
    parser.add_argument(
        "--table",
        default="bctc",
        help="Database table name."
    )
    parser.add_argument(
        "--mapping-file",
        default=str(Path(__file__).resolve().parent.parent / "plugins" / "logic" / "bctc.md"),
        help="Path to the mapping JSON file (bctc.md)."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform a dry run without deleting records from the database."
    )

    args = parser.parse_args()

    # 1. Load mapping file
    mapping_path = Path(args.mapping_file)
    print(f"[INFO] Loading mapping file from: {mapping_path}")
    if not mapping_path.exists():
        print(f"[ERROR] Mapping file not found: {mapping_path}")
        sys.exit(1)

    try:
        with open(mapping_path, "r", encoding="utf-8") as f:
            mappings = json.load(f)
        print(f"[SUCCESS] Successfully loaded {len(mappings)} indicator mappings from {mapping_path.name}")
    except Exception as e:
        print(f"[ERROR] Failed to parse mapping file: {e}")
        sys.exit(1)

    # Collect valid ind_codes
    valid_codes = set()
    for item in mappings:
        ind_code = str(item.get("ind_code", "")).strip()
        if ind_code:
            valid_codes.add(ind_code)

    if not valid_codes:
        print("[ERROR] No valid ind_codes found in the mapping file. Aborting to prevent deleting all records.")
        sys.exit(1)

    print(f"[INFO] Found {len(valid_codes)} unique valid ind_codes in mapping file.")

    # 2. Connect to Database
    db_url_masked = args.db_url
    if "@" in db_url_masked:
        parts = db_url_masked.split("@")
        db_url_masked = f"{parts[0].split('//')[0]}//***@{parts[1]}"
    
    print(f"[INFO] Connecting to database: {db_url_masked}")
    conn = get_db_connection(args.db_url)
    
    table_fqn = f"{args.schema}.{args.table}"

    try:
        with conn.cursor() as cur:
            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s 
                      AND table_name = %s
                );
            """, (args.schema, args.table))
            
            if not cur.fetchone()[0]:
                print(f"[ERROR] Table {table_fqn} does not exist in the database.")
                conn.close()
                sys.exit(1)

            # Query the number of records with invalid ind_codes
            # Convert set to tuple for SQL IN query compatibility
            valid_codes_tuple = tuple(valid_codes)
            
            count_sql = f"""
                SELECT COUNT(*), COUNT(DISTINCT ind_code)
                FROM {table_fqn}
                WHERE ind_code NOT IN %s;
            """
            cur.execute(count_sql, (valid_codes_tuple,))
            rows_to_delete, unique_invalid_codes_count = cur.fetchone()
            
            print(f"[INFO] Found {rows_to_delete:,} records with invalid/unmapped ind_codes (representing {unique_invalid_codes_count} unique code values).")
            
            if rows_to_delete == 0:
                print("[INFO] No records found with invalid ind_codes. Nothing to delete.")
                conn.close()
                return

            if args.dry_run:
                print(f"[INFO] [DRY RUN] Would delete {rows_to_delete:,} records from {table_fqn}.")
            else:
                delete_sql = f"""
                    DELETE FROM {table_fqn}
                    WHERE ind_code NOT IN %s;
                """
                print(f"[INFO] Deleting {rows_to_delete:,} invalid records from {table_fqn}...")
                cur.execute(delete_sql, (valid_codes_tuple,))
                deleted_rows = cur.rowcount
                conn.commit()
                print(f"[SUCCESS] Successfully deleted {deleted_rows:,} records from {table_fqn}.")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error during database synchronization: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
