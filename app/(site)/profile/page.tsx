"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import NotificationPreferencesPanel from "@/components/NotificationPreferencesPanel";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExperienceForm = {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  location: string;
  description: string;
  bullets: string;
};

type EducationForm = {
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  description: string;
};

type CertForm = {
  name: string;
  issuer: string;
  issueDate: string;
  credentialUrl: string;
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function Input({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">{label}</label>
      <input
        {...props}
        className="w-full rounded-lg border border-border-strong px-3.5 py-2.5 text-sm text-foreground-secondary placeholder:text-muted-foreground focus:border-[#4CAF7D] focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]/20 transition-colors"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Textarea({
  label,
  hint,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; rows?: number }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground-secondary">{label}</label>
      <textarea
        rows={rows}
        {...props}
        className="w-full resize-none rounded-lg border border-border-strong px-3.5 py-2.5 text-sm text-foreground-secondary placeholder:text-muted-foreground focus:border-[#4CAF7D] focus:outline-none focus:ring-2 focus:ring-[#4CAF7D]/20 transition-colors"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-sm font-medium text-muted hover:border-[#4CAF7D] hover:text-[#4CAF7D] transition-colors"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
      </svg>
      Add
    </button>
  );
}

function formatDate(yyyyMm?: string) {
  if (!yyyyMm) return "";
  const [y, m] = yyyyMm.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1] ?? ""} ${y}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border-strong py-8 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const profile = useQuery(api.profiles.getMyProfile);
  const experiences = useQuery(api.profiles.listMyExperiences);
  const educations = useQuery(api.profiles.listMyEducations);
  const certifications = useQuery(api.profiles.listMyCertifications);
  const files = useQuery(api.profiles.listMyFiles);

  const upsertProfile = useMutation(api.profiles.upsertProfile);
  const addExperience = useMutation(api.profiles.addExperience);
  const updateExperience = useMutation(api.profiles.updateExperience);
  const deleteExperience = useMutation(api.profiles.deleteExperience);
  const addEducation = useMutation(api.profiles.addEducation);
  const updateEducation = useMutation(api.profiles.updateEducation);
  const deleteEducation = useMutation(api.profiles.deleteEducation);
  const addCertification = useMutation(api.profiles.addCertification);
  const updateCertification = useMutation(api.profiles.updateCertification);
  const deleteCertification = useMutation(api.profiles.deleteCertification);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const addProfileFile = useMutation(api.profiles.addProfileFile);
  const deleteProfileFile = useMutation(api.profiles.deleteProfileFile);

  // ── About form ──────────────────────────────────────────────────────────────

  const [aboutSaving, setAboutSaving] = useState(false);
  const [aboutSaved, setAboutSaved] = useState(false);
  const [aboutForm, setAboutForm] = useState({
    headline: profile?.headline ?? "",
    summary: profile?.summary ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    yearsOfExperience: profile?.yearsOfExperience?.toString() ?? "",
    phone: profile?.phone ?? "",
    website: profile?.website ?? "",
    linkedin: profile?.linkedin ?? "",
    github: profile?.github ?? "",
    skills: profile?.skills?.join(", ") ?? "",
    openToWork: profile?.openToWork ?? false,
  });

  // Keep form in sync when profile loads for first time
  const profileLoaded = useRef(false);
  if (profile !== undefined && !profileLoaded.current) {
    profileLoaded.current = true;
    setAboutForm({
      headline: profile?.headline ?? "",
      summary: profile?.summary ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      yearsOfExperience: profile?.yearsOfExperience?.toString() ?? "",
      phone: profile?.phone ?? "",
      website: profile?.website ?? "",
      linkedin: profile?.linkedin ?? "",
      github: profile?.github ?? "",
      skills: profile?.skills?.join(", ") ?? "",
      openToWork: profile?.openToWork ?? false,
    });
  }

  async function handleSaveAbout(e: React.FormEvent) {
    e.preventDefault();
    setAboutSaving(true);
    try {
      const skills = aboutForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await upsertProfile({
        headline: aboutForm.headline || undefined,
        summary: aboutForm.summary || undefined,
        bio: aboutForm.bio || undefined,
        location: aboutForm.location || undefined,
        yearsOfExperience: aboutForm.yearsOfExperience ? parseInt(aboutForm.yearsOfExperience) : undefined,
        phone: aboutForm.phone || undefined,
        website: aboutForm.website || undefined,
        linkedin: aboutForm.linkedin || undefined,
        github: aboutForm.github || undefined,
        skills: skills.length ? skills : undefined,
        openToWork: aboutForm.openToWork,
      });
      setAboutSaved(true);
      setTimeout(() => setAboutSaved(false), 2500);
    } finally {
      setAboutSaving(false);
    }
  }

  // ── Experience modal ────────────────────────────────────────────────────────

  const blankExp: ExperienceForm = { title: "", company: "", startDate: "", endDate: "", isCurrent: false, location: "", description: "", bullets: "" };
  const [expModal, setExpModal] = useState<null | { mode: "add" } | { mode: "edit"; id: Id<"experiences"> }>(null);
  const [expForm, setExpForm] = useState<ExperienceForm>(blankExp);
  const [expSaving, setExpSaving] = useState(false);

  function openAddExp() { setExpForm(blankExp); setExpModal({ mode: "add" }); }
  function openEditExp(exp: typeof experiences extends (infer T)[] | undefined ? T : never) {
    if (!exp) return;
    setExpForm({
      title: (exp as { title: string }).title ?? "",
      company: (exp as { company: string }).company ?? "",
      startDate: (exp as { startDate: string }).startDate ?? "",
      endDate: (exp as { endDate?: string }).endDate ?? "",
      isCurrent: (exp as { isCurrent: boolean }).isCurrent ?? false,
      location: (exp as { location?: string }).location ?? "",
      description: (exp as { description?: string }).description ?? "",
      bullets: (exp as { bullets?: string[] }).bullets?.join("\n") ?? "",
    });
    setExpModal({ mode: "edit", id: (exp as { _id: Id<"experiences"> })._id });
  }

  async function handleSaveExp(e: React.FormEvent) {
    e.preventDefault();
    setExpSaving(true);
    try {
      const bullets = expForm.bullets.split("\n").map((b) => b.trim()).filter(Boolean);
      const payload = {
        title: expForm.title,
        company: expForm.company,
        startDate: expForm.startDate,
        endDate: expForm.isCurrent ? undefined : expForm.endDate || undefined,
        isCurrent: expForm.isCurrent,
        location: expForm.location || undefined,
        description: expForm.description || undefined,
        bullets: bullets.length ? bullets : undefined,
      };
      if (expModal?.mode === "edit") {
        await updateExperience({ id: expModal.id, ...payload });
      } else {
        await addExperience(payload);
      }
      setExpModal(null);
    } finally {
      setExpSaving(false);
    }
  }

  // ── Education modal ─────────────────────────────────────────────────────────

  const blankEdu: EducationForm = { school: "", degree: "", field: "", startYear: "", endYear: "", description: "" };
  const [eduModal, setEduModal] = useState<null | { mode: "add" } | { mode: "edit"; id: Id<"educations"> }>(null);
  const [eduForm, setEduForm] = useState<EducationForm>(blankEdu);
  const [eduSaving, setEduSaving] = useState(false);

  function openAddEdu() { setEduForm(blankEdu); setEduModal({ mode: "add" }); }
  function openEditEdu(edu: typeof educations extends (infer T)[] | undefined ? T : never) {
    if (!edu) return;
    setEduForm({
      school: (edu as { school: string }).school ?? "",
      degree: (edu as { degree?: string }).degree ?? "",
      field: (edu as { field?: string }).field ?? "",
      startYear: (edu as { startYear?: number }).startYear?.toString() ?? "",
      endYear: (edu as { endYear?: number }).endYear?.toString() ?? "",
      description: (edu as { description?: string }).description ?? "",
    });
    setEduModal({ mode: "edit", id: (edu as { _id: Id<"educations"> })._id });
  }

  async function handleSaveEdu(e: React.FormEvent) {
    e.preventDefault();
    setEduSaving(true);
    try {
      const payload = {
        school: eduForm.school,
        degree: eduForm.degree || undefined,
        field: eduForm.field || undefined,
        startYear: eduForm.startYear ? parseInt(eduForm.startYear) : undefined,
        endYear: eduForm.endYear ? parseInt(eduForm.endYear) : undefined,
        description: eduForm.description || undefined,
      };
      if (eduModal?.mode === "edit") {
        await updateEducation({ id: eduModal.id, ...payload });
      } else {
        await addEducation(payload);
      }
      setEduModal(null);
    } finally {
      setEduSaving(false);
    }
  }

  // ── Certification modal ─────────────────────────────────────────────────────

  const blankCert: CertForm = { name: "", issuer: "", issueDate: "", credentialUrl: "" };
  const [certModal, setCertModal] = useState<null | { mode: "add" } | { mode: "edit"; id: Id<"certifications"> }>(null);
  const [certForm, setCertForm] = useState<CertForm>(blankCert);
  const [certSaving, setCertSaving] = useState(false);

  function openAddCert() { setCertForm(blankCert); setCertModal({ mode: "add" }); }
  function openEditCert(cert: typeof certifications extends (infer T)[] | undefined ? T : never) {
    if (!cert) return;
    setCertForm({
      name: (cert as { name: string }).name ?? "",
      issuer: (cert as { issuer: string }).issuer ?? "",
      issueDate: (cert as { issueDate?: string }).issueDate ?? "",
      credentialUrl: (cert as { credentialUrl?: string }).credentialUrl ?? "",
    });
    setCertModal({ mode: "edit", id: (cert as { _id: Id<"certifications"> })._id });
  }

  async function handleSaveCert(e: React.FormEvent) {
    e.preventDefault();
    setCertSaving(true);
    try {
      const payload = {
        name: certForm.name,
        issuer: certForm.issuer,
        issueDate: certForm.issueDate || undefined,
        credentialUrl: certForm.credentialUrl || undefined,
      };
      if (certModal?.mode === "edit") {
        await updateCertification({ id: certModal.id, ...payload });
      } else {
        await addCertification(payload);
      }
      setCertModal(null);
    } finally {
      setCertSaving(false);
    }
  }

  // ── File upload ─────────────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json() as { storageId: Id<"_storage"> };
      await addProfileFile({
        storageId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } finally {
      setUploading(false);
    }
  }, [uploading, generateUploadUrl, addProfileFile]);

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) { void handleUpload(file); e.target.value = ""; }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleUpload(file);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (!isLoaded || profile === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-[#4CAF7D]" />
      </div>
    );
  }

  if (!user) {
    router.replace("/sign-in");
    return null;
  }

  const name = user.fullName ?? user.firstName ?? "Your Name";
  const avatarUrl = user.imageUrl;
  const glanceStats = [
    { label: "Experience", value: profile?.yearsOfExperience ? `${profile.yearsOfExperience} yrs` : "—" },
    { label: "Roles listed", value: experiences?.length ?? 0 },
    { label: "Education", value: educations?.length ?? 0 },
    { label: "Certifications", value: certifications?.length ?? 0 },
    { label: "Files", value: files?.length ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/jobs" className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#4CAF7D] opacity-50" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">Waks</span>
          </Link>
          <Link href="/jobs" className="text-sm text-muted hover:text-foreground transition-colors">
            ← Back to jobs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* ── Profile hero ─────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4CAF7D]/10 via-surface to-info-bg border border-border shadow-sm">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#4CAF7D]/5 to-transparent" />
          <div className="relative p-6">
            {profile?.openToWork && (
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#4CAF7D]/10 px-3 py-1 text-xs font-semibold text-[#3d9e6e]">
                <span className="h-2 w-2 rounded-full bg-[#4CAF7D] animate-pulse" />
                Open to work
              </div>
            )}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="h-20 w-20 rounded-2xl object-cover shadow-md" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4CAF7D] to-emerald-600 text-2xl font-bold text-white shadow-md">
                    {name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">{name}</h1>
                {profile?.headline && (
                  <p className="mt-0.5 text-sm font-medium text-muted">{profile.headline}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                  {profile?.location && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.274 1.765 11.842 11.842 0 00.757.433 5.73 5.73 0 00.28.14l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" /></svg>
                      {profile.location}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="flex items-center gap-1">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>
                      {profile.phone}
                    </span>
                  )}
                  {profile?.linkedin && (
                    <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      LinkedIn
                    </a>
                  )}
                  {profile?.github && (
                    <a href={profile.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                      GitHub
                    </a>
                  )}
                  {profile?.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#4CAF7D] hover:underline">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {/* ── About ─────────────────────────────────────────── */}
            <SectionCard title="About">
              <form onSubmit={handleSaveAbout} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Headline"
                    placeholder="e.g. Full Stack Developer"
                    value={aboutForm.headline}
                    onChange={(e) => setAboutForm((f) => ({ ...f, headline: e.target.value }))}
                  />
                  <Input
                    label="Location"
                    placeholder="e.g. New York, NY"
                    value={aboutForm.location}
                    onChange={(e) => setAboutForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>
                <Textarea
                  label="Summary"
                  rows={3}
                  placeholder="Your professional elevator pitch — recruiters see this first."
                  hint="Your professional elevator pitch — recruiters see this first."
                  value={aboutForm.summary}
                  onChange={(e) => setAboutForm((f) => ({ ...f, summary: e.target.value }))}
                />
                <Textarea
                  label="Bio"
                  rows={2}
                  placeholder="A more personal note about you."
                  value={aboutForm.bio}
                  onChange={(e) => setAboutForm((f) => ({ ...f, bio: e.target.value }))}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Location"
                    placeholder="San Francisco, CA"
                    value={aboutForm.location}
                    onChange={(e) => setAboutForm((f) => ({ ...f, location: e.target.value }))}
                  />
                  <Input
                    label="Years of experience"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 5"
                    value={aboutForm.yearsOfExperience}
                    onChange={(e) => setAboutForm((f) => ({ ...f, yearsOfExperience: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="Phone"
                    type="tel"
                    placeholder="+1 (415) 555-0192"
                    value={aboutForm.phone}
                    onChange={(e) => setAboutForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  <Input
                    label="Portfolio / Website"
                    type="url"
                    placeholder="https://yoursite.dev"
                    value={aboutForm.website}
                    onChange={(e) => setAboutForm((f) => ({ ...f, website: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="LinkedIn URL"
                    type="url"
                    placeholder="https://linkedin.com/in/you"
                    value={aboutForm.linkedin}
                    onChange={(e) => setAboutForm((f) => ({ ...f, linkedin: e.target.value }))}
                  />
                  <Input
                    label="GitHub URL"
                    type="url"
                    placeholder="https://github.com/you"
                    value={aboutForm.github}
                    onChange={(e) => setAboutForm((f) => ({ ...f, github: e.target.value }))}
                  />
                </div>
                <Textarea
                  label="Skills"
                  rows={2}
                  placeholder="TypeScript, React, Node.js, PostgreSQL…"
                  hint="Separate skills with commas."
                  value={aboutForm.skills}
                  onChange={(e) => setAboutForm((f) => ({ ...f, skills: e.target.value }))}
                />
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
                  <input
                    id="openToWork"
                    type="checkbox"
                    checked={aboutForm.openToWork}
                    onChange={(e) => setAboutForm((f) => ({ ...f, openToWork: e.target.checked }))}
                    className="h-4 w-4 rounded border-border-strong text-[#4CAF7D] focus:ring-[#4CAF7D]"
                  />
                  <label htmlFor="openToWork" className="cursor-pointer">
                    <span className="text-sm font-medium text-foreground-secondary">Open to work</span>
                    <span className="ml-2 text-xs text-muted">Let recruiters know you&apos;re available.</span>
                  </label>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={aboutSaving}
                    className="inline-flex items-center gap-2 rounded-full bg-[#4CAF7D] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3d9e6e] disabled:opacity-60"
                  >
                    {aboutSaving ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />Saving…</>
                    ) : "Save profile"}
                  </button>
                  {aboutSaved && (
                    <span className="text-sm font-medium text-[#4CAF7D]">✓ Saved</span>
                  )}
                </div>
              </form>
            </SectionCard>

            <SectionCard title="Application notifications">
              <NotificationPreferencesPanel />
            </SectionCard>

            {/* ── Skills quick view ──────────────────────────────── */}
            {profile?.skills && profile.skills.length > 0 && (
              <SectionCard title="Skills">
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-[#4CAF7D]/30 bg-[#4CAF7D]/5 px-3 py-1 text-xs font-medium text-[#3d9e6e]">
                      {skill}
                    </span>
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── Experience ─────────────────────────────────────── */}
            <SectionCard title="Experience" action={<AddButton onClick={openAddExp} />}>
              {!experiences || experiences.length === 0 ? (
                <EmptyState label="No experience added yet. Click + Add to get started." />
              ) : (
                <div className="space-y-5">
                  {experiences.map((exp) => (
                    <div key={exp._id} className="group relative rounded-xl border border-border bg-surface-muted/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /><path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" /></svg>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{exp.title}</p>
                            <p className="text-sm text-muted">{exp.company}{exp.location ? ` · ${exp.location}` : ""}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatDate(exp.startDate)} → {exp.isCurrent ? "Present" : formatDate(exp.endDate)}
                            </p>
                            {exp.description && <p className="mt-2 text-sm text-muted">{exp.description}</p>}
                            {exp.bullets && exp.bullets.length > 0 && (
                              <ul className="mt-2 space-y-1">
                                {exp.bullets.map((b, i) => (
                                  <li key={i} className="flex items-start gap-1.5 text-sm text-muted">
                                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gray-400" />
                                    {b}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button onClick={() => openEditExp(exp)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                          </button>
                          <button onClick={() => deleteExperience({ id: exp._id })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Education ─────────────────────────────────────── */}
            <SectionCard title="Education" action={<AddButton onClick={openAddEdu} />}>
              {!educations || educations.length === 0 ? (
                <EmptyState label="No education added yet." />
              ) : (
                <div className="space-y-4">
                  {educations.map((edu) => (
                    <div key={edu._id} className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-info-bg text-info-text">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{edu.school}</p>
                          {(edu.degree || edu.field) && (
                            <p className="text-sm text-muted">{[edu.degree, edu.field].filter(Boolean).join(" · ")}</p>
                          )}
                          {(edu.startYear || edu.endYear) && (
                            <p className="mt-0.5 text-xs text-muted-foreground">{edu.startYear ?? "?"} – {edu.endYear ?? "Present"}</p>
                          )}
                          {edu.description && <p className="mt-1 text-sm text-muted">{edu.description}</p>}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEditEdu(edu)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                        <button onClick={() => deleteEducation({ id: edu._id })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Certifications ────────────────────────────────── */}
            <SectionCard title="Certifications" action={<AddButton onClick={openAddCert} />}>
              {!certifications || certifications.length === 0 ? (
                <EmptyState label="No certifications added yet." />
              ) : (
                <div className="space-y-3">
                  {certifications.map((cert) => (
                    <div key={cert._id} className="group flex items-start justify-between gap-4 rounded-xl border border-border bg-surface-muted/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" /></svg>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{cert.name}</p>
                          <p className="text-sm text-muted">{cert.issuer}</p>
                          {cert.issueDate && <p className="mt-0.5 text-xs text-muted-foreground">Issued {cert.issueDate}</p>}
                          {cert.credentialUrl && (
                            <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-[#4CAF7D] hover:underline">
                              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
                              View credential
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button onClick={() => openEditCert(cert)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                        </button>
                        <button onClick={() => deleteCertification({ id: cert._id })} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── Resume & Resources ────────────────────────────── */}
            <SectionCard title="Resume & Resources">
              <p className="mb-4 text-xs text-muted">
                Upload your resume, portfolio, or any files to share with recruiters. Max 10 MB per file, up to 10 files.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mb-4 cursor-pointer rounded-xl border-2 border-dashed py-8 text-center transition-colors ${dragOver ? "border-[#4CAF7D] bg-[#4CAF7D]/5" : "border-border-strong hover:border-[#4CAF7D]/50 hover:bg-surface-muted"}`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={handleFileInputChange} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-strong border-t-[#4CAF7D]" />
                    <p className="text-sm text-muted">Uploading…</p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </div>
                    <p className="text-sm font-medium text-foreground-secondary">Drop a file here or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">PDF, DOC, images, or any file up to 10 MB</p>
                  </>
                )}
              </div>

              {files && files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => (
                    <FileRow key={file._id} file={file} onDelete={() => deleteProfileFile({ id: file._id })} />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Sidebar: At a glance ──────────────────────────────── */}
          <div className="space-y-6">
            <SectionCard title="At a glance">
              <dl className="space-y-3">
                {glanceStats.map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                    <dt className="text-sm text-muted">{label}</dt>
                    <dd className="text-sm font-semibold text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>

            <div className="rounded-2xl border border-border bg-gradient-to-br from-[#4CAF7D]/5 to-surface p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#3d9e6e]">Tips</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Add a headline — it's the first thing recruiters see.",
                  "Quantify your achievements in experience bullets.",
                  "Upload your latest resume for quick applications.",
                  "Check \"Open to work\" to get noticed faster.",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-muted">
                    <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#4CAF7D]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* ── Experience modal ──────────────────────────────────── */}
      {expModal && (
        <Modal title={expModal.mode === "add" ? "Add experience" : "Edit experience"} onClose={() => setExpModal(null)}>
          <form onSubmit={handleSaveExp} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Job title *" required placeholder="e.g. Senior Engineer" value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} />
              <Input label="Company *" required placeholder="e.g. Acme Corp" value={expForm.company} onChange={(e) => setExpForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <Input label="Location" placeholder="e.g. New York, NY (or Remote)" value={expForm.location} onChange={(e) => setExpForm((f) => ({ ...f, location: e.target.value }))} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Start date *" required type="month" value={expForm.startDate} onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))} />
              <Input label="End date" type="month" disabled={expForm.isCurrent} value={expForm.endDate} onChange={(e) => setExpForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input id="isCurrent" type="checkbox" checked={expForm.isCurrent} onChange={(e) => setExpForm((f) => ({ ...f, isCurrent: e.target.checked, endDate: "" }))} className="h-4 w-4 rounded border-border-strong text-[#4CAF7D]" />
              <label htmlFor="isCurrent" className="text-sm text-foreground-secondary">Currently working here</label>
            </div>
            <Textarea label="Description" rows={3} placeholder="Briefly describe your role and key responsibilities." value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
            <Textarea label="Bullet points" rows={3} placeholder={"• Architected React component library\n• Reduced bundle size by 40%\n• Mentored 4 junior engineers"} hint="One bullet per line." value={expForm.bullets} onChange={(e) => setExpForm((f) => ({ ...f, bullets: e.target.value }))} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setExpModal(null)} className="rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-muted hover:bg-surface-muted">Cancel</button>
              <button type="submit" disabled={expSaving} className="rounded-full bg-[#4CAF7D] px-6 py-2 text-sm font-semibold text-white hover:bg-[#3d9e6e] disabled:opacity-60">
                {expSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Education modal ──────────────────────────────────── */}
      {eduModal && (
        <Modal title={eduModal.mode === "add" ? "Add education" : "Edit education"} onClose={() => setEduModal(null)}>
          <form onSubmit={handleSaveEdu} className="space-y-4">
            <Input label="School / University *" required placeholder="e.g. Stanford University" value={eduForm.school} onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Degree" placeholder="e.g. Bachelor of Science" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} />
              <Input label="Field of study" placeholder="e.g. Computer Science" value={eduForm.field} onChange={(e) => setEduForm((f) => ({ ...f, field: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Start year" type="number" min="1950" max="2030" placeholder="2018" value={eduForm.startYear} onChange={(e) => setEduForm((f) => ({ ...f, startYear: e.target.value }))} />
              <Input label="End year" type="number" min="1950" max="2035" placeholder="2022" value={eduForm.endYear} onChange={(e) => setEduForm((f) => ({ ...f, endYear: e.target.value }))} />
            </div>
            <Textarea label="Description" rows={2} placeholder="Activities, honors, relevant coursework…" value={eduForm.description} onChange={(e) => setEduForm((f) => ({ ...f, description: e.target.value }))} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setEduModal(null)} className="rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-muted hover:bg-surface-muted">Cancel</button>
              <button type="submit" disabled={eduSaving} className="rounded-full bg-[#4CAF7D] px-6 py-2 text-sm font-semibold text-white hover:bg-[#3d9e6e] disabled:opacity-60">
                {eduSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Certification modal ──────────────────────────────── */}
      {certModal && (
        <Modal title={certModal.mode === "add" ? "Add certification" : "Edit certification"} onClose={() => setCertModal(null)}>
          <form onSubmit={handleSaveCert} className="space-y-4">
            <Input label="Certification name *" required placeholder="e.g. AWS Solutions Architect" value={certForm.name} onChange={(e) => setCertForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Issuing organization *" required placeholder="e.g. Amazon Web Services" value={certForm.issuer} onChange={(e) => setCertForm((f) => ({ ...f, issuer: e.target.value }))} />
            <Input label="Issue date" type="month" value={certForm.issueDate} onChange={(e) => setCertForm((f) => ({ ...f, issueDate: e.target.value }))} />
            <Input label="Credential URL" type="url" placeholder="https://credential.net/…" value={certForm.credentialUrl} onChange={(e) => setCertForm((f) => ({ ...f, credentialUrl: e.target.value }))} />
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCertModal(null)} className="rounded-full border border-border-strong px-5 py-2 text-sm font-medium text-muted hover:bg-surface-muted">Cancel</button>
              <button type="submit" disabled={certSaving} className="rounded-full bg-[#4CAF7D] px-6 py-2 text-sm font-semibold text-white hover:bg-[#3d9e6e] disabled:opacity-60">
                {certSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── File row with URL fetch ──────────────────────────────────────────────────

function FileRow({ file, onDelete }: { file: { _id: Id<"profileFiles">; storageId: Id<"_storage">; fileName: string; fileSize: number; mimeType: string }; onDelete: () => void }) {
  const url = useQuery(api.profiles.getFileUrl, { storageId: file.storageId });

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-surface border border-border-strong text-muted-foreground">
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground-secondary">{file.fileName}</p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground-secondary">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
          </a>
        )}
        <button onClick={onDelete} className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </div>
  );
}
