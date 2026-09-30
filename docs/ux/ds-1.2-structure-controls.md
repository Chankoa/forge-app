# DS 1.2 F — Course presentation and safe structure controls

Explorer maps the existing many-to-one domain relation correctly and reads the real course level. Domain buttons filter only loaded published domains. Featured and remaining published courses share domain, title, description, duration when known, and supported level. No publication date or ranking is inferred.

My Paths cards place relationship/status above identity, facts before progress, and actions at a bottom-aligned footer. A dual-role course gives the learner continuation action prominence and keeps Gérer secondary. The redundant owner overflow menu is absent from Cards; List keeps its existing menu. No destructive action is exposed in Workspace, Cards or Explorer.

Creator Structure uses inline title buttons for module and lesson rename. Enter submits the existing validated title; Escape cancels and restores focus. Blur does not save. Visible up/down buttons provide keyboard and touch reordering. The server checks ownership, membership and adjacent order; it swaps display_order values and attempts to restore the first value if the second update fails. Lesson IDs and slugs remain unchanged, preserving selection, progress, notes and publication state. No schema, RLS or cascade changes were made.

Only an empty module can display a delete button. Confirmation names the module. The server checks its real lesson and resource counts, then relies on the existing owner RLS policy, which also forbids deleting a module containing lessons. A filled module instead says to move its lessons first. The delete action does not remove lessons or learner records. Resources attached directly to the module also block deletion.

Cross-module lesson movement remains deferred: the current resource model can bind a resource to both a lesson and a module. Changing only the lesson module_id could leave that relationship inconsistent; updating both would require a coordinated mutation beyond this safe scope. Lesson deletion remains deferred because it could cascade learner notes.

At 1440/1100/430/390 px, the cards, Explorer and Creator Structure remain within the viewport. Mobile uses the existing shell and bottom navigation. The reference's drag handle is represented by explicit up/down controls, which work with keyboard and touch without a hover requirement.
