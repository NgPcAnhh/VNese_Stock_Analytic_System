import csv
import io

def rows_to_csv_string(rows: list[dict], max_rows: int = 30) -> str:
    if not rows:
        return "Không có dữ liệu cho yêu cầu này."

    rows = rows[:max_rows]
    columns = list(rows[0].keys())

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([row.get(col, "") for col in columns])
    
    return output.getvalue().strip()


def format_analysis_context(query_results: list[dict]) -> str:
    parts = []

    for item in query_results:
        name = item["name"]
        rows = item["rows"]

        parts.append(f"## {name}")
        parts.append(rows_to_csv_string(rows))

    return "\n\n".join(parts)


def rows_to_markdown_table(rows: list[dict], max_rows: int = 50) -> str:
    if not rows:
        return "Không có dữ liệu cho yêu cầu này."

    rows = rows[:max_rows]
    columns = list(rows[0].keys())

    header = "| " + " | ".join(str(c) for c in columns) + " |"
    separator = "|" + "|".join(["---"] * len(columns)) + "|"

    table_rows = []
    for row in rows:
        table_rows.append("| " + " | ".join(str(row.get(col, "")) for col in columns) + " |")

    return "\n".join([header, separator] + table_rows)