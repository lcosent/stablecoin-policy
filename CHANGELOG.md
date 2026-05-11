# Changelog

All notable changes to this project will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] — 2026-05-10

### Added
- Declarative YAML / JSON policy language with `version`, `metadata`, `predicates`, `views`
- 10 predicate operators: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`, `not_in`, `contains`, `starts_with`
- Field-to-value and field-to-field predicate comparisons
- Boolean composition in `when:` clauses (`and()`, `or()`, `not()`)
- Wildcard reveal (`"*"`) and dotted path reveal (`payer.display_name`)
- Predicate attestations: prove a property without revealing the underlying field
- Zod-based policy validation with helpful error messages
- CLI: `evaluate`, `validate`, `explain`
- 15-test suite covering compilation, evaluation, and condition parsing
- Sample policies for retail and B2B high-value stablecoin payments
