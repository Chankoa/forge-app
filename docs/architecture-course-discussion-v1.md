# Course discussion V1 architecture

`course_discussion_messages` is a private course-workspace record. It uses `courses.teacher_id` for the canonical owner and only active `editor` and `viewer` memberships for collaborators. Enrollments do not grant discussion access.

A message is scoped to its course and may reference exactly one context: the course, a module, or a lesson. The database validates that a referenced module or lesson belongs to the same course. Messages use a nullable `author_id` with `ON DELETE SET NULL`; deleting a profile preserves the collaboration record and shows `Utilisateur supprimé`. Deleting a course cascades its discussion records.

The table has no public visibility column and is never a source for a public profile feed. A future **Publier comme contribution** action must create a separate, permissioned public contribution record from explicitly approved content. It must belong to the message author, not a course owner moderating the original discussion. Deleting a private message must not implicitly publish, mutate, or remove any future contribution record.

V1 intentionally excludes realtime, unread state, mentions, attachments, notifications, and Forge AI chat persistence.
