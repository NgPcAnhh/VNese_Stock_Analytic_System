import json
from app.modules.chatbot.retrieval.vector_search import vector_search


async def lookup_ind_code(metric: str, top_k: int = 5) -> list[dict]:
    # Fetch a wider candidate set from vector DB, then filter down to best top_k matches
    results = await vector_search(
        query=metric,
        doc_type="bctc",
        top_k=max(30, top_k * 5),
    )

    matches = []

    for result in results:
        content = result["content"]

        try:
            items = json.loads(content)
        except Exception:
            continue

        raw_similarity = result.get("similarity")
        similarity = float(raw_similarity) if raw_similarity is not None else 0.0

        for item in items:
            raw_name = item.get("ind_name") or item.get("raw_name") or ""
            norm_name = item.get("norm_name") or ""
            ind_code = item.get("ind_code") or item.get("old_ind_code") or ""

            text = f"{raw_name} {norm_name}".strip().lower()
            text_clean = text.replace("(+)", "").replace("(-)", "").replace("tăng", "").replace("giảm", "").strip()

            if (text_clean and text_clean in metric.lower()) or (metric.lower() in text) or similarity >= 0.55:
                matches.append({
                    "raw_name": raw_name,
                    "norm_name": norm_name,
                    "ind_code": ind_code,
                    "similarity": similarity,
                    "chunk_id": result["chunk_id"],
                })

    return matches[:top_k]