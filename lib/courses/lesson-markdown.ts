export type LessonInsertAction = "paragraph" | "heading2" | "heading3" | "bold" | "italic" | "bullets" | "numbers" | "callout" | "quote" | "code" | "divider" | "link" | "image" | "audio" | "video" | "tab" | "practice";

export type LessonInsertion = { content: string; selectionStart: number; selectionEnd: number };

function fenceFor(value: string) {
  const runs = value.match(/`+/g) ?? [];
  return "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
}

export function insertLessonMarkdown(content: string, start: number, end: number, action: LessonInsertAction): LessonInsertion {
  const from = Math.max(0, Math.min(start, content.length));
  const to = Math.max(from, Math.min(end, content.length));
  const selected = content.slice(from, to);
  const hasSelection = Boolean(selected.trim());
  const value = selected.trim();
  let inserted: string;
  let focusText: string;
  switch (action) {
    case "paragraph": focusText = hasSelection ? value : "Nouveau paragraphe"; inserted = focusText; break;
    case "heading2": focusText = hasSelection ? value : "Titre de section"; inserted = `## ${focusText}`; break;
    case "heading3": focusText = hasSelection ? value : "Sous-section"; inserted = `### ${focusText}`; break;
    case "bold": focusText = hasSelection ? value : "Texte important"; inserted = `**${focusText}**`; break;
    case "italic": focusText = hasSelection ? value : "Texte mis en évidence"; inserted = `*${focusText}*`; break;
    case "bullets": {
      focusText = hasSelection ? value : "Premier point";
      inserted = focusText.split("\n").map((line) => `- ${line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim()}`).join("\n");
      break;
    }

    case "numbers": {
      focusText = hasSelection ? value : "Premier point";
      inserted = focusText.split("\n").map((line, index) => `${index + 1}. ${line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim()}`).join("\n");
      break;
    }
    case "callout": focusText = hasSelection ? value : "Point à retenir"; inserted = `> [!NOTE]\n> ${focusText.replace(/\n/g, "\n> ")}`; break;
    case "quote": focusText = hasSelection ? value : "Citation"; inserted = `> ${focusText.replace(/\n/g, "\n> ")}`; break;
    case "code": { focusText = hasSelection ? selected.replace(/^\n+|\n+$/g, "") : "Votre code ici"; const fence = fenceFor(focusText); inserted = `${fence}\n${focusText}\n${fence}`; break; }
    case "divider": focusText = ""; inserted = "---"; break;
    case "link": focusText = hasSelection ? value.replace(/\n/g, " ") : "Texte du lien"; inserted = `[${focusText}](https://exemple.fr)`; break;
    case "image": focusText = "Description de l’image"; inserted = `:::image\nstatus=placeholder\nalt=${focusText}\ncaption=Ajouter une image\n:::`; break;
    case "audio": focusText = "Exemple audio"; inserted = `:::audio\nstatus=placeholder\ntitle=${focusText}\ncaption=Ajouter un extrait audio\n:::`; break;
    case "video": focusText = "Démonstration vidéo"; inserted = `:::video\nstatus=placeholder\ntitle=${focusText}\ncaption=Ajouter une vidéo\n:::`; break;
    case "tab": focusText = "e|----------------|\nB|----------------|\nG|----------------|\nD|----------------|\nA|----------------|\nE|----------------|"; inserted = `\`\`\`tab\n${focusText}\n\`\`\``; break;
    case "practice": focusText = "Décrivez l’exercice"; inserted = `:::practice\ntitle=Exercice pratique\n:::\n${focusText}\n:::`; break;
  }
  const before = content.slice(0, from);
  const after = content.slice(to);
  if (action === "link") return { content: before + inserted + after, selectionStart: from + 1, selectionEnd: from + 1 + focusText.length };
  if (action === "divider" && hasSelection) {
    const prefix = before && !before.endsWith("\n\n") ? before.endsWith("\n") ? "\n" : "\n\n" : "";
    const nextContent = before + prefix + "---\n\n" + selected + after;
    const cursor = before.length + prefix.length + 5;
    return { content: nextContent, selectionStart: cursor, selectionEnd: cursor };
  }
  const prefix = before && !before.endsWith("\n\n") ? before.endsWith("\n") ? "\n" : "\n\n" : "";
  const suffix = after && !after.startsWith("\n\n") ? after.startsWith("\n") ? "\n" : "\n\n" : "";
  const position = before.length + prefix.length;
  const textOffset = focusText ? inserted.indexOf(focusText) : inserted.length;
  return { content: before + prefix + inserted + suffix + after, selectionStart: position + textOffset, selectionEnd: position + textOffset + focusText.length };
}

export function hasUnclosedCodeFence(content: string) {
  const fences = content.split(/\r?\n/).filter((line) => /^\s*`{3,}/.test(line));
  return fences.length % 2 !== 0;
}

// A media directive inside a code fence would render as code, so an insertion point inside a fence moves after its closing line.
function outsideCodeFence(content: string, position: number) {
  let offset = 0;
  let open = 0;
  for (const line of content.split("\n")) {
    const run = /^\s*(`{3,})/.exec(line)?.[1].length ?? 0;
    const closes = open > 0 && run >= open && /^\s*`+\s*$/.test(line);
    if (open > 0 && offset >= position && closes) return offset + line.length;
    if (closes) open = 0;
    else if (open === 0 && run > 0 && offset < position) open = run;
    offset += line.length + 1;
  }
  return position;
}

export function insertMediaResource(content: string, start: number, end: number, kind: "image" | "audio", resourceId: string, text: string, caption = ""): LessonInsertion {
  const rawFrom = Math.max(0, Math.min(start, content.length));
  const from = outsideCodeFence(content, rawFrom);
  const to = from === rawFrom ? Math.max(from, Math.min(end, content.length)) : from;
  const field = kind === "image" ? `alt=${text}` : `title=${text}`;
  const extra = caption.trim() ? `\ncaption=${caption.trim()}` : "";
  const inserted = `:::${kind}\nresource=${resourceId}\n${field}${extra}\n:::`;
  const before = content.slice(0, from);
  const after = content.slice(to);
  const prefix = before && !before.endsWith("\n\n") ? before.endsWith("\n") ? "\n" : "\n\n" : "";
  const suffix = after && !after.startsWith("\n\n") ? after.startsWith("\n") ? "\n" : "\n\n" : "";
  const cursor = from + prefix.length + inserted.length;
  return { content: before + prefix + inserted + suffix + after, selectionStart: cursor, selectionEnd: cursor };
}
