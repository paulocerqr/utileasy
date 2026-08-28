import argparse

from pdf2docx import Converter


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    arguments = parser.parse_args()

    converter = Converter(arguments.input)
    try:
        converter.convert(arguments.output, start=0, end=None)
    finally:
        converter.close()


if __name__ == "__main__":
    main()
