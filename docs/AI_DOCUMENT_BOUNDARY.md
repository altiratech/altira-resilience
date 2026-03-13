# Altira Resilience AI / Document Boundary

## Purpose

This note defines what is durable in source ingestion and what is intentionally replaceable.

Altira Resilience does not win because it can OCR a file. It wins because a firm can upload its own materials, review what was extracted, approve what should become structured context, and keep an audit-ready record of what happened.

## Durable Layers

Keep these layers separate:

1. Original source file
   - The uploaded file as received from the customer.
   - Stored inline for text or in R2 for larger/binary files.

2. Extracted text artifact
   - The current text output produced from the source file.
   - This is the artifact that suggestion generation reads from.
   - This is not the same thing as approved organization context.

3. Extraction attempt record
   - The latest background or manual attempt against the source file.
   - Includes status, error state, and attempt count.

4. Structured suggestions
   - Proposed teams, vendors, escalation roles, and other bounded context candidates.
   - Suggestions are review objects, not approved truth.

5. Approved organization context
   - The context records that the operator has accepted into the product.
   - This layer should never change automatically because a model improved.

## Replaceable AI Layer

The extraction provider is intentionally replaceable.

Today the product can use:
- native parsers for direct text extraction
- Workers AI markdown/OCR fallback for scanned or unreadable files

Future providers may change. The rest of the product should not depend on any one OCR or model vendor.

## Provenance Rules

Store provenance on:
- the extracted text artifact
- the latest extraction attempt

Each provenance record should capture:
- method
- provider
- version
- generated timestamp

This allows the team to answer simple enterprise questions:
- how was this text produced?
- when was it produced?
- which provider/model path produced it?
- can we rerun it with a newer extractor?

## Approval Boundary

AI can:
- convert files to text
- help produce structured suggestions
- improve extraction quality over time

AI cannot:
- mark context as approved
- rewrite approved context silently
- change launch state, scoring, evidence truth, or audit history

Operator review remains the control point between extracted suggestions and approved context.

## Reprocessing Rule

If extraction improves later:
- rerun against the original source file
- update the extracted text artifact
- regenerate suggestions as review items
- do not auto-apply those suggestions into approved context

This keeps the product future-proof without breaking trust.

## Current v1 Implication

For v1, supported uploads first attempt native extraction, then a bounded upload-time Workers AI pass when native text is missing, and only then fall back to queued follow-up extraction for stored files. The product should still present any AI-derived output as extracted material pending review, not as authoritative truth.

If the AI returns a visual description of the page or image instead of usable document text, that result should land in manual attention rather than creating reviewable suggestions.

If queued follow-up extraction cannot read the stored file bytes in the current environment, that result should also land in manual attention with an explicit environment/runtime note rather than a misleading OCR or file-integrity message.

If markdown conversion still fails on a scanned PDF, the queued path may use the provider-specific `workers_ai_vision` fallback, but that attempt should remain distinct in provenance from upload-time markdown conversion.

Legacy `.doc`, `.xls`, and `.ppt` files remain explicitly unsupported in v1.
