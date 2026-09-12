#!/usr/bin/env python3
"""evaluate.py — Runs the financial decision engine and evaluates output.

Usage:
    python3 evaluation/evaluate.py

This script:
  1. Loads dataset CSVs
  2. Runs the Node.js decision engine to generate output.csv
  3. Runs validation on the output
  4. Computes evaluation metrics on sample_requests.csv
  5. Reports results
"""

import csv
import json
import os
import subprocess
import sys
from datetime import datetime

PROJECT_ROOT = os.path.join(os.path.dirname(__file__), '..')
DATASET_DIR = os.path.join(PROJECT_ROOT, 'dataset')
OUTPUT_FILE = os.path.join(PROJECT_ROOT, 'output.csv')
SAMPLE_FILE = os.path.join(DATASET_DIR, 'sample_requests.csv')


def run_engine():
    """Run the Node.js decision engine to generate output.csv"""
    script = os.path.join(PROJECT_ROOT, 'scripts', 'generate-output.mjs')
    print("Running decision engine...")
    result = subprocess.run(
        ['node', script],
        capture_output=True,
        text=True,
        cwd=PROJECT_ROOT
    )
    if result.returncode != 0:
        print(f"Engine failed: {result.stderr}")
        return False
    print(f"  {result.stdout.strip()}")
    return True


def load_csv(path):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def evaluate_sample():
    """Evaluate decisions for sample_requests.csv"""
    if not os.path.exists(SAMPLE_FILE):
        print("  sample_requests.csv not found, skipping sample evaluation")
        return

    sample_reqs = load_csv(SAMPLE_FILE)
    sample_ids = {r['request_id'] for r in sample_reqs}

    if not os.path.exists(OUTPUT_FILE):
        print("  output.csv not found, cannot evaluate samples")
        return

    output_rows = load_csv(OUTPUT_FILE)
    sample_decisions = [r for r in output_rows if r['request_id'] in sample_ids]

    print(f"\nSample evaluation ({len(sample_decisions)} requests):")
    print("-" * 80)

    for row in sample_decisions:
        rid = row['request_id']
        status = row['affordability_status']
        method = row['recommended_payment_method']
        safe = row['amount_safe_to_pay']
        earliest = row['earliest_date_for_full_payment']
        changes = row['spending_changes_needed']

        print(f"  {rid}: {status} | {method} | safe={safe} | earliest={earliest} | changes={changes}")

    # Summary stats
    status_counts = {}
    method_counts = {}
    for row in sample_decisions:
        status_counts[row['affordability_status']] = status_counts.get(row['affordability_status'], 0) + 1
        method_counts[row['recommended_payment_method']] = method_counts.get(row['recommended_payment_method'], 0) + 1

    print(f"\n  Status distribution: {json.dumps(status_counts)}")
    print(f"  Method distribution: {json.dumps(method_counts)}")


def run_validation():
    """Run the validation script"""
    print("\nRunning validation...")
    script = os.path.join(os.path.dirname(__file__), 'validate_output.py')
    result = subprocess.run(
        ['python3', script],
        capture_output=True,
        text=True
    )
    print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result.returncode == 0


def main():
    print("=" * 80)
    print("Buy or Wait? — Evaluation Pipeline")
    print("=" * 80)

    # Step 1: Run engine
    if not run_engine():
        print("FAILED: Could not generate output.csv")
        sys.exit(1)

    # Step 2: Validate output
    valid = run_validation()

    # Step 3: Evaluate samples
    print("\nEvaluating sample requests...")
    evaluate_sample()

    print("\n" + "=" * 80)
    if valid:
        print("EVALUATION PASSED: All checks passed")
    else:
        print("EVALUATION FAILED: Validation errors found")
    print("=" * 80)

    sys.exit(0 if valid else 1)


if __name__ == '__main__':
    main()
