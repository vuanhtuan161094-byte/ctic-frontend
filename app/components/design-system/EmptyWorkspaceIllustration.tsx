import type { ReactElement } from "react";

export type EmptyIllustrationKind = "work" | "calendar" | "records" | "customers";

/** Original vector illustration; decorative, with semantics in the Empty label. */
export function EmptyWorkspaceIllustration({ kind }: { kind: EmptyIllustrationKind }): ReactElement {
  return (
    <svg className="cmp-empty-illustration" aria-hidden="true" focusable="false" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="107" rx="48" ry="6" fill="var(--cmp-neutral-300)" opacity=".55"/>
      <circle cx="80" cy="53" r="47" fill="var(--cmp-surface-selected)" opacity=".7"/>
      <circle cx="124" cy="19" r="3" fill="var(--cmp-brand-accent)" opacity=".5"/>
      {kind === "work" && <>
        <rect x="51" y="19" width="59" height="81" rx="9" fill="var(--cmp-neutral-0)" stroke="var(--cmp-border-strong)" strokeWidth="1.5"/>
        <path fill="none" d="M62 35h30M62 43h22M62 66h37M62 77h27M62 88h21" stroke="var(--cmp-neutral-500)" strokeWidth="3" strokeLinecap="round" opacity=".6"/>
        <path d="m64 54 6 6 11-13" stroke="var(--cmp-brand-primary)" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
      {kind === "calendar" && <>
        <rect x="40" y="28" width="80" height="68" rx="9" fill="var(--cmp-neutral-0)" stroke="var(--cmp-border-strong)" strokeWidth="1.5"/>
        <path fill="none" d="M40 45h80" stroke="var(--cmp-brand-primary)" strokeWidth="3" opacity=".5"/>
        <path fill="none" d="M58 24v14M102 24v14" stroke="var(--cmp-brand-primary)" strokeWidth="3" strokeLinecap="round"/>
        <path fill="none" d="M57 58h11M77 58h11M97 58h9M57 71h11M77 71h11M97 71h9M57 84h11M77 84h11" stroke="var(--cmp-neutral-500)" opacity=".7" strokeWidth="3.5" strokeLinecap="round"/>
        <circle cx="102" cy="83" r="7" fill="var(--cmp-brand-primary)" opacity=".78"/>
      </>}
      {kind === "records" && <>
        <rect x="55" y="18" width="60" height="72" rx="8" fill="var(--cmp-neutral-100)" stroke="var(--cmp-border-strong)" strokeWidth="1.5"/>
        <rect x="44" y="27" width="60" height="72" rx="8" fill="var(--cmp-neutral-0)" stroke="var(--cmp-border-strong)" strokeWidth="1.5"/>
        <path fill="none" d="M56 46h36M56 56h36M56 66h25" stroke="var(--cmp-neutral-500)" opacity=".65" strokeWidth="3" strokeLinecap="round"/>
        <path d="m62 81 7 7 14-16" stroke="var(--cmp-brand-primary)" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
      {kind === "customers" && <>
        <rect x="37" y="34" width="86" height="65" rx="10" fill="var(--cmp-neutral-0)" stroke="var(--cmp-border-strong)" strokeWidth="1.5"/>
        <circle cx="61" cy="56" r="10" fill="var(--cmp-brand-primary)" opacity=".28"/>
        <path d="M47 80c0-18 28-18 28 0" fill="var(--cmp-brand-primary)" opacity=".28"/>
        <path fill="none" d="M83 51h27M83 62h22M83 73h29" stroke="var(--cmp-neutral-500)" strokeWidth="3" strokeLinecap="round" opacity=".66"/>
        <path d="M52 30v-6c0-4 3-7 7-7h42c4 0 7 3 7 7v6" stroke="var(--cmp-brand-primary)" opacity=".6" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </>}
    </svg>
  );
}
