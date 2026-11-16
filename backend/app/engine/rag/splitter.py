import re
from typing import List

class RecursiveTextSplitter:
    """
    Recursively splits text into overlapping chunks using hierarchical delimiters:
    Double newlines -> single newlines -> sentence breaks -> spaces -> characters.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def split_text(self, text: str) -> List[str]:
        if not text:
            return []
        text = text.strip()
        if len(text) <= self.chunk_size:
            return [text]

        return self._split(text, self.separators)

    def _split(self, text: str, separators: List[str]) -> List[str]:
        final_chunks: List[str] = []
        separator = separators[-1]
        new_separators = []

        for i, sep in enumerate(separators):
            if sep == "":
                separator = ""
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break

        splits = text.split(separator) if separator else list(text)

        good_splits = []
        for s in splits:
            if not s.strip():
                continue
            if len(s) < self.chunk_size:
                good_splits.append(s)
            else:
                if new_separators:
                    sub_splits = self._split(s, new_separators)
                    good_splits.extend(sub_splits)
                else:
                    good_splits.append(s[:self.chunk_size])

        # Merge splits with overlap
        merged: List[str] = []
        current_chunk: List[str] = []
        current_len = 0

        for piece in good_splits:
            piece_len = len(piece) + (len(separator) if current_chunk else 0)
            if current_len + piece_len > self.chunk_size and current_chunk:
                merged_str = separator.join(current_chunk).strip()
                if merged_str:
                    merged.append(merged_str)
                # Keep overlap from the end
                overlap_len = 0
                overlap_pieces: List[str] = []
                for p in reversed(current_chunk):
                    if overlap_len + len(p) <= self.chunk_overlap:
                        overlap_pieces.insert(0, p)
                        overlap_len += len(p)
                    else:
                        break
                current_chunk = overlap_pieces
                current_len = sum(len(p) for p in current_chunk)

            current_chunk.append(piece)
            current_len += len(piece)

        if current_chunk:
            final_str = separator.join(current_chunk).strip()
            if final_str:
                merged.append(final_str)

        return merged
