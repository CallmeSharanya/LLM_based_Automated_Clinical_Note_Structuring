import csv

input_path = "icd10cm-codes-2026.txt"  # path to the file you extracted
output_path = "icd10.csv"

with open(input_path, "r", encoding="utf-8") as infile, open(output_path, "w", newline="", encoding="utf-8") as outfile:
    writer = csv.writer(outfile)
    writer.writerow(["code", "description"])
    for line in infile:
        parts = line.strip().split(maxsplit=1)
        if len(parts) == 2:
            writer.writerow(parts)
