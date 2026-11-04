export function containsSearch(search) {
  return { contains: search.replace(/[\\%_]/g, "\\$&"), mode: "insensitive" };
}

export function academicSearch(match) {
  return [
    { programme: { OR: [{ name: match }, { code: match }, { department: { OR: [{ name: match }, { code: match }] } }] } },
    { level: { OR: [{ name: match }, { code: match }] } },
    { session: { name: match } }
  ];
}
