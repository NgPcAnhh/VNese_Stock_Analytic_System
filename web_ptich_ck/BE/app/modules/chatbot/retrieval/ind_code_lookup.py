import json
from app.modules.chatbot.retrieval.vector_search import vector_search


async def lookup_ind_code(metric: str, top_k: int = 5) -> list[dict]:
    results = await vector_search(
        query=metric,
        doc_type="bctc",
        top_k=top_k,
    )

    matches = []

    for result in results:
        content = result["content"]

        try:
            items = json.loads(content)
        except Exception:
            continue

        for item in items:
            raw_name = item.get("raw_name", "")
            norm_name = item.get("norm_name", "")
            old_ind_code = item.get("old_ind_code", "")

            text = f"{raw_name} {norm_name}".lower()
            if metric.lower() in text or result["similarity"] >= 0.55:
                matches.append({
                    "raw_name": raw_name,
                    "norm_name": norm_name,
                    "ind_code": old_ind_code,
                    "similarity": float(result["similarity"]),
                    "chunk_id": result["chunk_id"],
                })

    return matches[:top_k]