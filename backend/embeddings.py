# embeddings.py
from sentence_transformers import SentenceTransformer
import numpy as np

# load model once
EMBED_MODEL_NAME = "all-MiniLM-L6-v2"
_model = None

def get_model():
    global _model
    if _model is None:
        try:
            _model = SentenceTransformer(EMBED_MODEL_NAME)
        except Exception as e:
            print(f"Error loading model: {e}")
            _model = None
    return _model

def embed_texts(texts):
    """
    texts: list[str] or single str
    returns numpy array of embeddings (float32)
    """
    model = get_model()
    if isinstance(texts, str):
        texts = [texts]
    emb = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
    return emb  # shape (n, dim)

def cosine_sim(a, b):
    # a: (d,), b: (n,d) -> returns (n,)
    return np.dot(b, a)  # if normalized, dot product = cosine
