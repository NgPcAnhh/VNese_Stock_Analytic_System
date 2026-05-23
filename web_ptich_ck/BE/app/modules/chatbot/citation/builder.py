def build_citation(source_type: str, **kwargs) -> dict:
    citation = {"source_type": source_type}

    for key in ["ticker", "period", "metric", "as_of"]:
        if key in kwargs and kwargs[key]:
            citation[key] = kwargs[key]

    return citation


def citation_to_text(citation: dict) -> str:
    parts = [f"Nguồn: {citation.get('source_type')}"]

    if citation.get("ticker"):
        parts.append(citation["ticker"])
    if citation.get("period"):
        parts.append(citation["period"])
    if citation.get("metric"):
        parts.append(citation["metric"])
    if citation.get("as_of"):
        parts.append(f"Cập nhật: {citation['as_of']}")

    return "[" + " | ".join(parts) + "]"