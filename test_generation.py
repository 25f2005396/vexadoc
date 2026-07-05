from retrieval.search import search
from generation.prompt import build_prompt
from generation.llm import generate
from generation.citations import build_citations, format_citations

query = "what is this document about?"

try:
    # Step 1: Retrieve
    search_results = search(query)
    chunks = search_results["results"]
    print(f"Retrieved {len(chunks)} chunks")

    # Step 2: Build prompt
    prompt = build_prompt(query, chunks)
    print("Prompt built successfully")
    print("-" * 40)

    # Step 3: Generate answer
    answer = generate(prompt)
    print("ANSWER:")
    print(answer)
    print("-" * 40)

    # Step 4: Citations
    citations = build_citations(chunks)
    print("SOURCES:")
    print(format_citations(citations))

except Exception as e:
    print("\nERROR:")
    print(e)