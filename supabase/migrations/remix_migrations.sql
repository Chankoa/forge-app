-- ============================================================
-- 1. ENUMS ET FORME EXACTE DES TABLES
-- ============================================================

-- 1A. Colonnes, types, nullabilité et valeurs par défaut.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'courses',
    'course_modules',
    'lessons',
    'domains'
  )
order by table_name, ordinal_position;

-- 1B. Toutes les valeurs des enums réellement utilisés par ces colonnes.
select
  table_name,
  column_name,
  enum_schema,
  enum_name,
  enum_label,
  enum_sort_order
from (
  select
    c.table_name,
    c.column_name,
    n.nspname as enum_schema,
    t.typname as enum_name,
    e.enumlabel as enum_label,
    e.enumsortorder as enum_sort_order
  from information_schema.columns c
  join pg_namespace n
    on n.nspname = c.udt_schema
  join pg_type t
    on t.typnamespace = n.oid
   and t.typname = c.udt_name
  join pg_enum e
    on e.enumtypid = t.oid
  where c.table_schema = 'public'
    and c.table_name in (
      'courses',
      'course_modules',
      'lessons',
      'domains'
    )
) enum_values
order by table_name, column_name, enum_sort_order;

-- 1C. Check constraints utiles si un statut est stocké en text
-- plutôt que dans un enum PostgreSQL.
select
  table_name,
  constraint_name,
  check_clause
from information_schema.check_constraints checks
join information_schema.table_constraints constraints
  on constraints.constraint_catalog = checks.constraint_catalog
 and constraints.constraint_schema = checks.constraint_schema
 and constraints.constraint_name = checks.constraint_name
where constraints.table_schema = 'public'
  and constraints.table_name in (
    'courses',
    'course_modules',
    'lessons',
    'domains'
  )
  and constraints.constraint_type = 'CHECK'
order by table_name, constraint_name;


-- ============================================================
-- 2. FOREIGN KEYS ET CLÉ DE COURS
-- ============================================================

-- 2A. FK et comportement exact, y compris ON DELETE.
select
  source_ns.nspname as source_schema,
  source_table.relname as source_table,
  constraint_info.conname as constraint_name,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
join pg_class source_table
  on source_table.oid = constraint_info.conrelid
join pg_namespace source_ns
  on source_ns.oid = source_table.relnamespace
where constraint_info.contype = 'f'
  and source_ns.nspname = 'public'
  and source_table.relname in (
    'course_modules',
    'lessons',
    'course_memberships',
    'enrollments',
    'lesson_progress',
    'courses'
  )
order by source_table.relname, constraint_info.conname;

-- 2B. Prérequis pour les futures FK de provenance.
select
  table_ns.nspname as table_schema,
  course_table.relname as table_name,
  constraint_info.conname as constraint_name,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
join pg_class course_table
  on course_table.oid = constraint_info.conrelid
join pg_namespace table_ns
  on table_ns.oid = course_table.relnamespace
where table_ns.nspname = 'public'
  and course_table.relname = 'courses'
  and constraint_info.contype in ('p', 'u')
order by constraint_info.contype, constraint_info.conname;


-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

-- 3A. SELECT : publication publique, propriétaire et collaborateur.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'courses',
    'course_modules',
    'lessons',
    'course_memberships'
  )
  and cmd in ('SELECT', 'ALL')
order by tablename, policyname;

-- 3B. INSERT : viabilité future de SECURITY INVOKER.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'courses',
    'course_modules',
    'lessons'
  )
  and cmd in ('INSERT', 'ALL')
order by tablename, policyname;

-- 3C. RLS est-elle activée ou forcée sur les tables concernées ?
select
  table_ns.nspname as schema_name,
  table_info.relname as table_name,
  table_info.relrowsecurity as rls_enabled,
  table_info.relforcerowsecurity as rls_forced
from pg_class table_info
join pg_namespace table_ns
  on table_ns.oid = table_info.relnamespace
where table_ns.nspname = 'public'
  and table_info.relname in (
    'courses',
    'course_modules',
    'lessons',
    'course_memberships'
  )
order by table_info.relname;


-- ============================================================
-- 4. GET_PUBLIC_COURSE_AUTHOR : DÉFINITION ET DROITS
-- ============================================================

-- 4A. Définition, SECURITY INVOKER/DEFINER et search_path.
select
  procedure_ns.nspname as schema_name,
  procedure_info.oid::regprocedure as function_signature,
  procedure_info.prosecdef as is_security_definer,
  procedure_info.proconfig as function_settings,
  pg_get_function_result(procedure_info.oid) as returns,
  pg_get_functiondef(procedure_info.oid) as definition
from pg_proc procedure_info
join pg_namespace procedure_ns
  on procedure_ns.oid = procedure_info.pronamespace
where procedure_ns.nspname in ('public', 'private')
  and procedure_info.proname = 'get_public_course_author'
  and pg_get_function_identity_arguments(procedure_info.oid) = 'target_course_id uuid';

-- 4B. Droits d'exécution effectifs et ACL détaillée.
select
  procedure_ns.nspname as schema_name,
  procedure_info.oid::regprocedure as function_signature,
  has_function_privilege('authenticated', procedure_info.oid, 'EXECUTE')
    as authenticated_can_execute,
  coalesce(grantee.rolname, 'PUBLIC') as grantee,
  acl.privilege_type,
  acl.is_grantable
from pg_proc procedure_info
join pg_namespace procedure_ns
  on procedure_ns.oid = procedure_info.pronamespace
cross join lateral aclexplode(
  coalesce(procedure_info.proacl, acldefault('f', procedure_info.proowner))
) acl
left join pg_roles grantee
  on grantee.oid = acl.grantee
where procedure_ns.nspname in ('public', 'private')
  and procedure_info.proname = 'get_public_course_author'
  and pg_get_function_identity_arguments(procedure_info.oid) = 'target_course_id uuid'
order by grantee, acl.privilege_type;


-- ============================================================
-- 5. RELATION DOMAINES ET RÈGLE ACTIVE
-- ============================================================

-- 5A. FK précise de courses.domain_id.
select
  source_table.relname as source_table,
  constraint_info.conname as constraint_name,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
join pg_class source_table
  on source_table.oid = constraint_info.conrelid
join pg_namespace source_ns
  on source_ns.oid = source_table.relnamespace
where source_ns.nspname = 'public'
  and source_table.relname = 'courses'
  and constraint_info.contype = 'f'
  and pg_get_constraintdef(constraint_info.oid, true)
    ilike '%domain_id%'
order by constraint_info.conname;

-- 5B. Colonnes et contraintes du référentiel de domaines,
-- notamment la représentation de "active".
select
  column_name,
  data_type,
  udt_schema,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'domains'
order by ordinal_position;

select
  constraint_info.conname as constraint_name,
  pg_get_constraintdef(constraint_info.oid, true) as definition
from pg_constraint constraint_info
join pg_class domain_table
  on domain_table.oid = constraint_info.conrelid
join pg_namespace domain_ns
  on domain_ns.oid = domain_table.relnamespace
where domain_ns.nspname = 'public'
  and domain_table.relname = 'domains'
  and constraint_info.contype in ('p', 'u', 'c')
order by constraint_info.contype, constraint_info.conname;