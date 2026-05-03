"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { usePathname } from "next/navigation";

type SidebarProject = {
  id: string;
  name: string;
  slug: string;
};

type DashboardNavProps = {
  user: {
    name: string;
    email: string;
  };
  organization: {
    name: string;
    plan: "free" | "pro" | "team";
  };
  projects: SidebarProject[];
};

const links = [
  { href: "/dashboard", label: "Overview", icon: "//" },
  { href: "/dashboard/projects", label: "Projects", icon: "[]" },
  { href: "/dashboard/settings", label: "Settings", icon: "::" }
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || ">_";
}

function linkClass(active: boolean) {
  return [
    "group flex items-center gap-3 rounded-sm border px-3 py-2.5 font-mono text-xs uppercase tracking-[0.14em] transition",
    active
      ? "border-violet-300/50 bg-violet-500/10 text-white shadow-[0_0_24px_rgba(139,92,246,0.12)]"
      : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.02] hover:text-white"
  ].join(" ");
}

export function DashboardNav({ user, organization, projects }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-white/10 bg-[#050507]/95 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-80 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 lg:block lg:px-6 lg:py-6">
        <a href="/" className="font-mono text-sm uppercase tracking-[0.16em] text-white transition hover:text-violet-200">&gt;_ CommitGlow</a>
        <a href="/dashboard/projects" className="rounded-sm border border-violet-300/40 bg-violet-500/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.14em] text-violet-100 transition hover:border-violet-200 lg:mt-6 lg:flex lg:w-full lg:justify-center">
          + Project
        </a>
      </div>

      <div className="hidden border-b border-white/10 px-6 py-5 lg:block">
        <div className="mb-5 rounded-sm border border-violet-300/30 bg-violet-500/10 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">// Workspace</p>
          <p className="mt-2 truncate font-mono text-sm text-white">{organization.name}</p>
          <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-zinc-600">plan: {organization.plan}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-white/[0.03] font-mono text-xs text-violet-200">
            {initials(user.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-white">{user.name}</p>
            <p className="truncate font-mono text-xs text-zinc-600">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 py-4 lg:block lg:min-h-0 lg:flex-1 lg:space-y-7 lg:overflow-y-auto lg:px-6 lg:py-6">
        <nav className="flex gap-2 lg:block lg:space-y-1" aria-label="Dashboard">
          <p className="hidden pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700 lg:block">// Navigation</p>
          {links.map((link) => {
            const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);

            return (
              <a key={link.href} href={link.href} className={linkClass(active)}>
                <span className="w-6 text-zinc-600 group-hover:text-violet-200">{link.icon}</span>
                <span>{link.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="hidden lg:block">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700">// Project Tree</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-700">{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-sm border border-dashed border-white/10 p-4">
              <p className="font-mono text-sm text-zinc-500">No project nodes.</p>
              <p className="mt-2 font-mono text-xs leading-5 text-zinc-700">Create one and it will appear here for quick access.</p>
            </div>
          ) : (
            <div className="space-y-1 font-mono text-sm">
              <div className="text-zinc-600">projects/</div>
              <div className="ml-3 space-y-1 border-l border-white/10 pl-3">
                {projects.map((project) => (
                  <a
                    key={project.id}
                    href={`/dashboard/projects#project-${project.slug}`}
                    className="group block rounded-sm px-2 py-2 text-zinc-500 transition hover:bg-white/[0.02] hover:text-white"
                    title={project.name}
                  >
                    <span className="text-zinc-700 group-hover:text-violet-200">|- </span>
                    <span className="truncate align-bottom">{project.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="hidden border-t border-white/10 p-6 lg:block">
        <div className="mb-4 rounded-sm border border-white/10 bg-black/30 p-3 font-mono text-xs leading-6 text-zinc-600">
          <p className="text-zinc-500">status: local</p>
          <p>repos: next phase</p>
        </div>
        <SignOutButton />
      </div>

      <div className="border-t border-white/10 px-5 py-4 lg:hidden">
        <SignOutButton />
      </div>
    </aside>
  );
}
