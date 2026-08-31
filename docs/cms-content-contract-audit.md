# Global Backend page contracts

## Purpose
This document audits the content contracts established in `src/content-contracts/pageContracts.js` against the frontend UI and database schema, ensuring that the backend strictly enforces these contracts and only canonical data is written or edited.

## Architecture & Responsibilities

1. **`pageContracts.js`** (Authoritative Truth)
   - Defines `PAGE_CONTRACTS`: all schemas for `CODE_TEMPLATE` pages.
   - Defines strict validation rules (`validateContractContent`) which enforce:
     - No unknown regions.
     - No unknown fields.
     - Type checking (boolean, string-list, object-list with nested items, URL protocol safety, maxLength, maxLines).
   - Dictates how slots behave in the visual editor (`source`: `PAGE_SECTION`, `ENTITY`, `GLOBAL_SETTINGS`, `SYSTEM`, `UNBOUND`).
   - Responsible for serializer `toCanonicalObjectList` to filter nested legacy data prior to database persistence.

2. **`pageEditorClient.js`** (Visual Editor UI)
   - Disables layout additions/reorderings/deletions for `CODE_TEMPLATE` pages.
   - Restricts data patches (`handleSaveSection`) to only the canonical `allowedFields`.
   - Normalizes and formats object-list types before saving.
   - Adds reordering (Move Up / Down) logic to arrays (string-list and object-list).
   - Surfaces server-side 400 validation errors accurately to the user.

3. **`page.service.js` & `route.js`** (Server Validation & Storage)
   - `route.js` strips bypassing validation for `CODE_TEMPLATE` and defers all schema validation authoritatively to `page.service.js`.
   - `page.service.js` strictly validates any `CODE_TEMPLATE` updates against `pageContracts.js`.
   - Upon successful validation, the service merges the strictly allowed canonical fields onto the *existing* section content object, ensuring preservation of legacy keys in the DB.

4. **`codeTemplatePages.js`** (Initialization & Migration)
   - Initializes every editable `PAGE_SECTION` region (regardless of the `required` flag) using `getContractRegions`.
   - Deep-clones `defaultValue` properties when instantiating new slots.
   - Safely migrates legacy data (e.g., merging `titleLine1` and `titleLine2` into `title`, normalizing `<br>` to `\n` in text areas, falling back `eyebrow` to `badge`) without destroying data using `migrateCanonicalField` and `migrateObjectListField`.

## Validation Contract

- **Idempotency**: Reconciliation safely evaluates missing regions and re-creates them, preserving existing sections exactly as-is.
- **Strict Checks**: Empty values (`""`) or missing optional values are permitted unless `required: true` is explicitly present in the field definition. Strict `hasOwnProperty` checks are used to prevent false positives when evaluating intentional empties.
- **Nested Schema**: `object-list` fields enforce exact schema matching on their subfields. Any missing required subfields, or subfields with disallowed types/protocols fail the entire patch request.

## Verified Implementation Areas

- **HOME** page (`hero`, `articles`, `blogCategories`, `wellnessBanner`, `quiz`, `wellnessKitchen`, `authenticated`, `communityEvents`, `servicesBanner`, `newsletter`)
- **ABOUT** page (`hero`, `ourStory`, `stats`, `team`, `facilities`, `cta`)
- **SERVICES** page (`hero`, `mainOfferings`, `process`, `pricing`, `testimonials`, `cta`)
- **CONTACT** page (`hero`, `locations`, `contactForm`, `faq`)
- **BLOGS** page (`hero`, `featuredPost`, `categoryNav`, `postGrid`, `newsletter`)

## Maintenance Guidelines
- Add new `CODE_TEMPLATE` fields *only* inside `pageContracts.js`.
- If a frontend component needs to read an old legacy key temporarily, continue to use `readField(content, fieldDef)` to bridge the gap.
- Do not bypass server validation. The database content column is a partial JSON patch target that respects legacy fields while forcing strict adherence on the newest canonical fields.
