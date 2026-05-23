const IMAGE_EXT_RE = /\.(?:avif|webp|png|jpe?g|gif|bmp|svg)(?:\?|#|$)/i;
const DATA_IMAGE_RE = /^data:image\/[a-z0-9.+-]+;base64,/i;

const ATTR_CANDIDATES = [
    "src",
    "data-src",
    "data-original",
    "data-lazy",
    "data-lazy-src",
    "data-image",
    "data-bg",
    "data-background",
    "href",
    "srcset",
    "data-srcset",
];

function isImageUrl(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (DATA_IMAGE_RE.test(trimmed)) return true;
    return IMAGE_EXT_RE.test(trimmed);
}

function splitSrcset(value: string): string[] {
    return value
        .split(",")
        .map((part) => part.trim().split(/\s+/)[0])
        .filter(Boolean);
}

function pushCandidates(target: string[], value: string | null): void {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (trimmed.includes(",") && trimmed.match(/\s\d/)) {
        splitSrcset(trimmed).forEach((entry) => target.push(entry));
        return;
    }
    target.push(trimmed);
}

function collectFromDom(summary: string, candidates: string[]): void {
    if (typeof window === "undefined" || typeof DOMParser === "undefined") return;
    const doc = new DOMParser().parseFromString(summary, "text/html");
    const elements = Array.from(
        doc.querySelectorAll(
            "img, source, a, [src], [href], [data-src], [data-original], [data-lazy], [data-lazy-src], [data-image], [data-bg], [data-background], [srcset], [data-srcset]"
        )
    );

    elements.forEach((el) => {
        ATTR_CANDIDATES.forEach((attr) => {
            pushCandidates(candidates, el.getAttribute(attr));
        });
    });
}

function collectFromText(summary: string, candidates: string[]): void {
    const urlMatches = summary.match(/(https?:\/\/|\/\/)[^"'\s>]+/gi) ?? [];
    urlMatches.forEach((match) => candidates.push(match));
    const dataMatches = summary.match(/data:image\/[a-z0-9.+-]+;base64,[^"'\s>]+/gi) ?? [];
    dataMatches.forEach((match) => candidates.push(match));
}

export function extractNewsImage(summary: string | null): string {
    if (!summary) return "No image";
    const candidates: string[] = [];

    collectFromDom(summary, candidates);
    collectFromText(summary, candidates);

    const match = candidates.find(isImageUrl);
    return match ?? "No image";
}
