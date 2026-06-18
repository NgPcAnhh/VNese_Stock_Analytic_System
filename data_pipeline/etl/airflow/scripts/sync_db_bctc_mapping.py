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
        
    parser = argparse.ArgumentParser(description="Synchronize and standardize ind_code based on ind_name in Postgres DWH.")
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
        help="Print what would change without modifying the database."
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

    # Convert mappings list of dict to unique {ind_name: ind_code}
    unique_mappings = {}
    for item in mappings:
        ind_name = str(item.get("ind_name", "")).strip()
        ind_code = str(item.get("ind_code", "")).strip()
        if ind_name and ind_code:
            unique_mappings[ind_name] = ind_code

    print(f"[INFO] Found {len(unique_mappings)} unique indicator mapping entries to sync.")

    # 2. Connect to Database
    db_url_masked = args.db_url
    if "@" in db_url_masked:
        parts = db_url_masked.split("@")
        db_url_masked = f"{parts[0].split('//')[0]}//***@{parts[1]}"
    
    print(f"[INFO] Connecting to database: {db_url_masked}")
    conn = get_db_connection(args.db_url)
    
    table_fqn = f"{args.schema}.{args.table}"

    total_deleted = 0
    total_updated = 0
    total_skipped = 0

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

            print(f"[INFO] Synchronizing {table_fqn}...")
            
            for ind_name, new_code in unique_mappings.items():
                delete_duplicates_sql = f"""
                    DELETE FROM {table_fqn} t1
                    WHERE t1.ind_name = %s
                      AND t1.ind_code != %s
                      AND EXISTS (
                          SELECT 1
                          FROM {table_fqn} t2
                          WHERE t2.ticker = t1.ticker
                            AND t2.year = t1.year
                            AND t2.quarter = t1.quarter
                            AND t2.ind_name = t1.ind_name
                            AND (
                                t2.ind_code = %s
                                OR
                                (t2.ind_code != %s AND t2.ctid > t1.ctid)
                            )
                      );
                """

                # SQL to update old ind_code to the new_code for the remaining rows
                update_sql = f"""
                    UPDATE {table_fqn}
                    SET ind_code = %s
                    WHERE ind_name = %s
                      AND ind_code != %s;
                """

                if args.dry_run:
                    # For dry run, count potential deletes and updates
                    # Count duplicates to delete
                    count_duplicates_sql = f"""
                        SELECT COUNT(*) FROM {table_fqn} t1
                        WHERE t1.ind_name = %s
                          AND t1.ind_code != %s
                          AND EXISTS (
                              SELECT 1
                              FROM {table_fqn} t2
                              WHERE t2.ticker = t1.ticker
                                AND t2.year = t1.year
                                AND t2.quarter = t1.quarter
                                AND t2.ind_name = t1.ind_name
                                AND (
                                    t2.ind_code = %s
                                    OR
                                    (t2.ind_code != %s AND t2.ctid > t1.ctid)
                                )
                          );
                    """
                    cur.execute(count_duplicates_sql, (ind_name, new_code, new_code, new_code))
                    deleted_count = cur.fetchone()[0]

                    # Count updates
                    count_updates_sql = f"""
                        SELECT COUNT(*) FROM {table_fqn}
                        WHERE ind_name = %s
                          AND ind_code != %s;
                    """
                    # Subtract those that will be deleted anyway
                    cur.execute(count_updates_sql, (ind_name, new_code))
                    total_old_rows = cur.fetchone()[0]
                    updated_count = max(0, total_old_rows - deleted_count)
                    
                    if deleted_count > 0 or updated_count > 0:
                        print(f"[INFO] [DRY RUN] {ind_name} -> {new_code}: Would delete {deleted_count} duplicates, update {updated_count} rows.")
                        total_deleted += deleted_count
                        total_updated += updated_count
                else:
                    # Execute duplicate deletion
                    cur.execute(delete_duplicates_sql, (ind_name, new_code, new_code, new_code))
                    deleted_count = cur.rowcount
                    
                    # Execute update
                    cur.execute(update_sql, (new_code, ind_name, new_code))
                    updated_count = cur.rowcount
                    
                    if deleted_count > 0 or updated_count > 0:
                        print(f"[SUCCESS] {ind_name} -> {new_code}: Deleted {deleted_count} duplicates, updated {updated_count} rows.")
                        total_deleted += deleted_count
                        total_updated += updated_count

        if not args.dry_run:
            conn.commit()
            print("\n" + "=" * 50)
            print("[SUCCESS] Synchronization completed successfully!")
            print(f"Total duplicate rows deleted: {total_deleted}")
            print(f"Total rows updated: {total_updated}")
            print("=" * 50)
        else:
            print("\n" + "=" * 50)
            print("[INFO] Dry run completed successfully! (No database changes made)")
            print(f"Potential duplicate rows deleted: {total_deleted}")
            print(f"Potential rows updated: {total_updated}")
            print("=" * 50)

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error during database synchronization: {e}")
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
