from ingestion.parser import parse_file


def main():
    result = parse_file("data/raw_docs/sample.pdf")

    print("=" * 60)
    print("VexaDoc Parser Test")
    print("=" * 60)

    print(f"File Type   : {result['file_type']}")
    print(f"Total Pages : {result['total_pages']}")
    print()

    for page in result["pages"]:
        print("-" * 60)
        print(f"Page {page['page_number']}")
        print("-" * 60)
        print(page["text"][:500])  # Print first 500 characters
        print()


if __name__ == "__main__":
    main()