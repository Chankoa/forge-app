export type UploadKind = "avatar" | "cover" | "image" | "audio";

const operationErrors: Record<UploadKind, string> = {
  avatar: "La photo n’a pas pu être téléversée.",
  cover: "L’image de couverture n’a pas pu être téléversée.",
  image: "L’image n’a pas pu être ajoutée à la leçon.",
  audio: "Le fichier audio n’a pas pu être ajouté à la leçon.",
};

// Server Action transport and render errors can contain framework or storage internals.
export function uploadOperationError(kind: UploadKind): string { return operationErrors[kind]; }
