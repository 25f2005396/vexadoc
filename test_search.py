from retrieval.search import search

results = search("what is this document about?")
print("Query:", results["query"])
print("Found:", results["count"], "results")

for i, r in enumerate(results["results"]):
    print(f"--- Result {i+1} (similarity: {r['similarity']}) ---")
    print(r["text"][:200])
    print()