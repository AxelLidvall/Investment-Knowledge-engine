from langchain_text_splitters import RecursiveCharacterTextSplitter

_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=128,
    length_function=len,  # character-based; close enough for embedding budget
)


def chunk_pages(pages: list[dict]) -> list[dict]:
    """
    Split page texts into overlapping chunks.

    Args:
        pages: Output of parser.parse_pdf — list of {"page_num": int, "text": str}.

    Returns:
        List of {"page_num": int, "chunk_index": int, "text": str} dicts.
        chunk_index is global across the document (not per-page).
    """
    chunks = []
    global_index = 0

    for page in pages:
        splits = _splitter.split_text(page["text"])
        for split in splits:
            chunks.append(
                {
                    "page_num": page["page_num"],
                    "chunk_index": global_index,
                    "text": split,
                }
            )
            global_index += 1

    return chunks
