# Future course discussion contract

This is a placement and interaction contract only. Course discussion is not implemented and has no persistence or realtime transport.

## Placement

Reserve a **Discussion** destination in the course workspace, alongside the existing management destinations. In lesson context, the composer may be scoped to that lesson while remaining part of the same course discussion surface. Do not add a global sidebar or place discussion in Forge Chat: Forge conversations are private, contextual AI assistance and have a separate, session-only lifecycle.

## Interaction boundary

Discussion messages are shared course collaboration records, unlike Forge Chat. A future implementation must check course membership and role on every read and write, and must not treat authoring capability or public course visibility as permission to post. Message creation, edits, and deletion must be explicit user actions; AI suggestions are never posted automatically.

## Data and policy questions to resolve before implementation

- Message id and course id.
- Optional module and lesson context, validated to belong to that course.
- Author identity and server-assigned timestamp.
- Text validation, length limit, and safe rendering.
- Owner, editor, and viewer visibility and posting permissions.
- Mentions are a later feature, not part of the initial contract.
- Define whether authors can edit/delete their own messages, and whether owners can moderate messages.
- Define audit/history expectations before choosing an edit or delete model.
- Define retention, pagination, and notification behavior before adding persistence.

No schema, migration, RLS policy, message API, or persistence behavior is introduced by this document.
