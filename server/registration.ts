import { HttpError } from "./security.js";
const courses = [
  "1-ci kurs",
  "2-ci kurs",
  "3-cü kurs",
  "4-cü kurs",
  "Magistr 1",
  "Magistr 2",
];
export function validateRegistration(b: any, now = new Date()) {
  const fields = [
    "first_name",
    "last_name",
    "father_name",
    "birth_date",
    "gender",
    "phone",
    "email",
    "faculty",
    "specialty",
    "course",
    "membership_reason",
    "languages",
    "skills",
    "additional_note",
    "privacy_accepted",
  ];
  if (
    !b ||
    typeof b !== "object" ||
    Array.isArray(b) ||
    Object.keys(b).some((k) => !fields.includes(k))
  )
    throw new HttpError(400, "Forma məlumatları düzgün deyil.");
  const text = (k: string, min: number, max: number) => {
    if (
      typeof b[k] !== "string" ||
      b[k].trim().length < min ||
      b[k].trim().length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(b[k])
    )
      throw new HttpError(400, "Forma məlumatları düzgün deyil.");
    return b[k].trim();
  };
  const birth = text("birth_date", 10, 10);
  const d = new Date(birth + "T00:00:00Z");
  const min = new Date(now);
  min.setUTCFullYear(min.getUTCFullYear() - 100);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(birth) ||
    !Number.isFinite(d.getTime()) ||
    d.toISOString().slice(0, 10) !== birth ||
    d > now ||
    d < min
  )
    throw new HttpError(400, "Doğum tarixi düzgün deyil.");
  const phone = text("phone", 13, 20);
  if (
    !/^\+994[ -]?(10|50|51|55|60|70|77|99|12)[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}$/.test(
      phone,
    )
  )
    throw new HttpError(400, "Telefon düzgün deyil.");
  const email = text("email", 5, 254).toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email) ||
    !courses.includes(b.course) ||
    !["Kişi", "Qadın"].includes(b.gender) ||
    b.privacy_accepted !== true
  )
    throw new HttpError(400, "Forma məlumatları düzgün deyil.");
  if (
    !Array.isArray(b.languages) ||
    b.languages.length < 1 ||
    b.languages.length > 5 ||
    b.languages.some(
      (l: any) =>
        !l ||
        Object.keys(l).some((k) => !["language", "level"].includes(k)) ||
        typeof l.language !== "string" ||
        l.language.trim().length < 2 ||
        l.language.length > 60 ||
        !["A1–A2", "B1–B2", "C1–C2"].includes(l.level),
    )
  )
    throw new HttpError(400, "Dil məlumatları düzgün deyil.");
  const optional = (k: string) =>
    b[k] == null || b[k] === "" ? null : text(k, 1, 1000);
  return {
    first_name: text("first_name", 2, 80),
    last_name: text("last_name", 2, 80),
    father_name: text("father_name", 2, 80),
    birth_date: birth,
    gender: b.gender,
    phone,
    email,
    faculty: text("faculty", 2, 120),
    specialty: text("specialty", 2, 160),
    course: b.course,
    membership_reason: text("membership_reason", 10, 2000),
    languages: b.languages.map((l: any) => ({
      language: l.language.trim(),
      level: l.level,
    })),
    skills: text("skills", 1, 1000),
    additional_note: optional("additional_note"),
    privacy_accepted: true,
  };
}
