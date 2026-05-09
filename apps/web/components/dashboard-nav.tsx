"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { switchWorkspace } from "@/app/dashboard/workspaces/actions";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { plans, toPlanSlug } from "@/lib/plans";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type SidebarProject = {
  id: string;
  name: string;
  slug: string;
  repositories: Array<{
    id: string;
    owner: string;
    name: string;
  }>;
};

type DashboardNavProps = {
  identity: {
    name: string;
    email: string;
    plan: unknown;
  };
  organization: {
    id: string;
    name: string;
  };
  organizations: Array<{
    id: string;
    name: string;
    role: "owner" | "admin" | "member";
  }>;
  workspaceLimit: {
    count: number;
    label: string;
    reached: boolean;
  };
  usageSummary: {
    generations: string;
    generationsUsed: string;
    projects: string;
    providers: string;
  };
  projects: SidebarProject[];
};

const links = [
  { href: "/dashboard", label: "Overview", icon: "chart" },
  { href: "/dashboard/projects", label: "Projects", icon: "folder" },
  { href: "/dashboard/providers", label: "Providers", icon: "repo" },
  { href: "/dashboard/workspace/settings", label: "Workspace Settings", icon: "sliders" }
];

const dropdownPanelClass = "dropdown-panel absolute z-50 overflow-hidden rounded-sm border border-violet-300/25 bg-[#050507]/98 shadow-[0_26px_90px_rgba(0,0,0,0.62),0_0_54px_rgba(139,92,246,0.16)] ring-1 ring-white/[0.03] backdrop-blur-xl";
const dropdownItemClass = "relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition before:pointer-events-none before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-transparent hover:bg-white/[0.045] hover:before:bg-violet-200/70";

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
    "group flex min-h-11 min-w-[10rem] items-center gap-3 rounded-sm border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[0.14em] transition lg:min-w-0",
    active
      ? "border-violet-300/50 bg-violet-500/10 text-white shadow-[0_0_24px_rgba(139,92,246,0.12)]"
      : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
  ].join(" ");
}

function Icon({ name }: { name: string }) {
  const className = "size-4 shrink-0 text-zinc-600 group-hover:text-violet-200";

  if (name === "folder") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path d="M3.5 7.5h6l1.8 2h9.2v8.2a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3V7.5Z" />
        <path d="M3.5 7.5V6.3C3.5 5 4.5 4 5.8 4h3.4l2 2.1" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path d="M16 19.5v-1.2c0-2.2-1.8-4-4-4H8c-2.2 0-4 1.8-4 4v1.2" />
        <path d="M10 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
        <path d="M18 11.5a2.4 2.4 0 0 0 0-4.8" />
        <path d="M20 19.5v-1c0-1.5-.8-2.8-2-3.5" />
      </svg>
    );
  }

  if (name === "sliders") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 6h10" />
        <path d="M18 6h2" />
        <path d="M4 12h3" />
        <path d="M11 12h9" />
        <path d="M4 18h12" />
        <path d="M20 18h0" />
        <path d="M14 4.5v3" />
        <path d="M8 10.5v3" />
        <path d="M17 16.5v3" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (name === "repo") {
    return (
      <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
        <path d="M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3.5 19.5h17" />
    </svg>
  );
}

function sectionTitle(label: string, count?: number) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between gap-3 px-3 first:mt-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-700">// {label}</p>
      {typeof count === "number" ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-700">{count}</span>
      ) : null}
    </div>
  );
}

export function DashboardNav({ identity, organization, organizations, workspaceLimit, usageSummary, projects }: DashboardNavProps) {
  const pathname = usePathname();
  const accountPlan = toPlanSlug(identity.plan);
  const isFreePlan = accountPlan === "free";
  const activeProject = projects.find((project) => pathname === `/dashboard/projects/${project.slug}` || pathname.startsWith(`/dashboard/projects/${project.slug}/`));
  const [showProjectSidebar, setShowProjectSidebar] = useState(Boolean(activeProject));
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  useEffect(() => {
    setShowProjectSidebar(Boolean(activeProject));
  }, [activeProject?.id]);

  useEffect(() => {
    if (!createWorkspaceOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreateWorkspaceOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [createWorkspaceOpen]);

  return (
    <aside className="relative z-20 border-b border-white/10 bg-[#050507]/95 shadow-[20px_0_80px_rgba(0,0,0,0.32)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="relative border-b border-white/10 p-4">
        <details className="group/top relative lg:block">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm border border-transparent p-2 transition hover:border-violet-300/25 hover:bg-white/[0.035] group-open/top:border-violet-300/30 group-open/top:bg-violet-500/[0.06] [&::-webkit-details-marker]:hidden">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-violet-300/40 bg-violet-500/10 font-mono text-xs text-violet-100">
              {initials(organization.name)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-white">{organization.name}</span>
            <span className="font-mono text-xs text-zinc-600 transition group-open/top:rotate-180 group-open/top:text-violet-100">v</span>
          </summary>
          <div className={`${dropdownPanelClass} left-0 right-0 top-full mt-2 lg:left-0 lg:right-auto lg:w-80`}>
            <div className="h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />
            <div className="border-b border-white/10 bg-white/[0.025] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">// Workspaces</div>
            <div className="max-h-56 overflow-y-auto py-1 scrollbar-soft">
              {organizations.map((item) => {
                const active = item.id === organization.id;

                return (
                <form key={item.id} action={switchWorkspace}>
                  <input type="hidden" name="organizationId" value={item.id} />
                  <button className={[dropdownItemClass, active ? "bg-violet-500/[0.08] before:bg-violet-200/80" : ""].join(" ")} type="submit">
                    <span className={["flex size-8 shrink-0 items-center justify-center rounded-sm border font-mono text-xs", active ? "border-violet-200/55 bg-violet-500/15 text-white shadow-[0_0_24px_rgba(139,92,246,0.18)]" : "border-violet-300/30 bg-violet-500/10 text-violet-100"].join(" ")}>
                      {initials(item.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm text-white">{item.name}</span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{item.role}</span>
                    </span>
                    {active ? (
                      <svg aria-hidden="true" className="size-4 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path d="m5 12 4 4 10-10" />
                      </svg>
                    ) : null}
                  </button>
                </form>
                );
              })}
            </div>
            <button
              type="button"
              disabled={workspaceLimit.reached}
              onClick={() => setCreateWorkspaceOpen(true)}
              className="group relative flex w-full items-center gap-3 border-t border-white/10 bg-white/[0.018] px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-violet-100 transition hover:bg-violet-500/[0.07] hover:text-white disabled:cursor-not-allowed disabled:text-violet-950 disabled:hover:bg-transparent"
              title={workspaceLimit.reached ? `Workspace limit reached: ${workspaceLimit.count}/${workspaceLimit.label}` : "Create workspace"}
            >
              <Icon name="plus" />
              {workspaceLimit.reached ? `Limit reached ${workspaceLimit.count}/${workspaceLimit.label}` : "Create workspace"}
            </button>
          </div>
        </details>
      </div>

      {createWorkspaceOpen ? (
        <div className="workspace-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-workspace-title">
          <button type="button" className="absolute inset-0 cursor-default" aria-label="Close create workspace modal" onClick={() => setCreateWorkspaceOpen(false)} />
          <div className="workspace-modal-card relative w-full max-w-md overflow-hidden rounded-sm border border-violet-300/25 bg-[#050507] p-6 shadow-[0_28px_120px_rgba(0,0,0,0.65),0_0_50px_rgba(139,92,246,0.16)]">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-200/70 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-violet-200">// New Workspace</p>
                <h2 id="create-workspace-title" className="mt-3 font-mono text-2xl text-white">Create workspace</h2>
                <p className="mt-3 text-sm leading-6 text-zinc-500">Your {accountPlan} account is using {workspaceLimit.count}/{workspaceLimit.label} workspaces.</p>
              </div>
              <button type="button" onClick={() => setCreateWorkspaceOpen(false)} className="rounded-sm border border-white/10 px-2 py-1 font-mono text-xs text-zinc-500 transition hover:border-violet-300/40 hover:text-white">ESC</button>
            </div>
            <WorkspaceCreateForm disabled={workspaceLimit.reached} onSuccess={() => setCreateWorkspaceOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="scrollbar-soft flex gap-2 overflow-x-auto p-4 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:py-6">
        {activeProject && showProjectSidebar ? (
          <div className="project-sidebar-enter flex gap-2 lg:block">
            <button type="button" onClick={() => setShowProjectSidebar(false)} className="group flex min-w-[10rem] items-center gap-3 rounded-sm border border-white/10 px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:border-violet-300/40 hover:bg-white/[0.03] hover:text-white lg:min-w-0">
              <span className="text-zinc-600 transition group-hover:-translate-x-0.5 group-hover:text-violet-200">&lt;-</span>
              <span>Workspace Menu</span>
            </button>

            <div className="hidden border-b border-white/10 pb-5 pt-5 lg:block">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">// Active Project</p>
              <p className="mt-2 truncate font-mono text-lg text-white">{activeProject.name}</p>
              <p className="mt-1 truncate font-mono text-xs text-zinc-600">/{activeProject.slug}</p>
            </div>

            <nav className="flex gap-1 lg:mt-5 lg:block lg:space-y-1 lg:mb-3" aria-label="Project navigation">
              <Link href={`/dashboard/projects/${activeProject.slug}`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}`)}>
                <Icon name="chart" />
                <span className="truncate font-medium">Overview</span>
              </Link>
              <Link href={`/dashboard/projects/${activeProject.slug}/repositories`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/repositories`)}>
                <Icon name="repo" />
                <span className="truncate font-medium">Repositories</span>
              </Link>
              <Link href={`/dashboard/projects/${activeProject.slug}/changelogs`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/changelogs`)}>
                <Icon name="folder" />
                <span className="truncate font-medium">Changelogs</span>
              </Link>
              <Link href={`/dashboard/projects/${activeProject.slug}/settings`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/settings`)}>
                <Icon name="sliders" />
                <span className="truncate font-medium">Settings</span>
              </Link>
            </nav>

            <div className="hidden lg:block">
              {sectionTitle("Project Repos", activeProject.repositories.length)}
              {activeProject.repositories.length === 0 ? (
                <div className="rounded-sm border border-dashed border-white/10 p-4">
                  <p className="text-sm text-zinc-500">No repositories.</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-700">Attach one from this project page.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeProject.repositories.map((repository) => (
                    <Link key={repository.id} href={`/dashboard/projects/${activeProject.slug}/repositories/${repository.id}`} className="group flex items-center gap-2 rounded-sm p-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-600 transition hover:bg-white/[0.03] hover:text-white" title={`${repository.owner}/${repository.name}`}>
                      <Icon name="repo" />
                      <span className="truncate">{repository.owner}/{repository.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeProject ? (
              <button type="button" onClick={() => setShowProjectSidebar(true)} className="project-sidebar-enter mb-4 flex min-w-[10rem] items-center gap-3 rounded-sm border border-violet-300/30 bg-violet-500/[0.07] px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[0.14em] text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-500/10 lg:w-full lg:min-w-0">
                <span className="truncate">Return to {activeProject.name}</span>
                <span className="ml-auto text-zinc-500">-&gt;</span>
              </button>
            ) : null}
            <nav className="mb-4 flex gap-1 lg:block lg:space-y-1" aria-label="Dashboard">
              {links.map((link) => {
                const active = link.href === "/dashboard" ? pathname === link.href : pathname.startsWith(link.href);

                return (
                  <Link key={link.href} href={link.href} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                    <Icon name={link.icon} />
                    <span className="truncate font-medium">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="hidden lg:block">
              {sectionTitle("Workspace Tree", projects.length)}

              {projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4">
                  <p className="text-sm text-zinc-500">No projects yet.</p>
                  <p className="mt-2 text-xs leading-5 text-zinc-700">Create one and it will appear here.</p>
                </div>
              ) : (
                <div className="max-h-80 space-y-1 overflow-y-auto pr-1 scrollbar-soft">
                  {projects.map((project) => (
                    <div key={project.id}>
                      <Link
                        href={`/dashboard/projects/${project.slug}`}
                        className="group flex items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                        title={project.name}
                      >
                        <Icon name="folder" />
                        <span className="truncate font-medium">{project.name}</span>
                      </Link>
                      {project.repositories.length > 0 ? (
                        <div className="ml-5 border-l border-white/10 pl-3">
                          {project.repositories.map((repository) => (
                            <Link key={repository.id} href={`/dashboard/projects/${project.slug}/repositories/${repository.id}`} className="group flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-600 transition hover:bg-white/[0.03] hover:text-white" title={`${repository.owner}/${repository.name}`}>
                              <Icon name="repo" />
                              <span className="truncate">{repository.owner}/{repository.name}</span>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <details className="group/mobile border-t border-white/10 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-white/[0.03] hover:text-white [&::-webkit-details-marker]:hidden">
          <span>More</span>
          <span className="text-zinc-600 transition group-open/mobile:rotate-180">v</span>
        </summary>
        <div className="max-h-[60vh] overflow-y-auto border-t border-white/10 p-4 scrollbar-soft">
          <Link
            href="/pricing"
            className="group mb-3 flex items-center justify-between gap-3 rounded-sm border border-violet-300/20 bg-violet-500/[0.06] p-3 transition hover:border-violet-200/50 hover:bg-violet-500/10"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100">{isFreePlan ? "Upgrade" : "Account Plan"}</p>
              <p className="truncate text-xs text-zinc-500">{isFreePlan ? "More workspaces" : plans[accountPlan].label}</p>
            </div>
            <span className="shrink-0 rounded-sm border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">{accountPlan}</span>
          </Link>

          <div className="grid gap-2 border-b border-white/10 pb-4">
            <Link href="/dashboard/account" className="rounded-sm border border-white/10 p-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:border-violet-300/40 hover:bg-white/[0.03] hover:text-white">Account settings</Link>
            <Link href="/" className="rounded-sm border border-white/10 p-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:border-violet-300/40 hover:bg-white/[0.03] hover:text-white">Homepage</Link>
          </div>

          {activeProject && activeProject.repositories.length > 0 ? (
            <div className="border-b border-white/10 py-4">
              {sectionTitle("Project Repos", activeProject.repositories.length)}
              <div className="grid gap-1">
                {activeProject.repositories.map((repository) => (
                  <Link key={repository.id} href={`/dashboard/projects/${activeProject.slug}/repositories/${repository.id}`} className="group flex min-h-11 items-center gap-2 rounded-sm p-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-500 transition hover:bg-white/[0.03] hover:text-white" title={`${repository.owner}/${repository.name}`}>
                    <Icon name="repo" />
                    <span className="truncate">{repository.owner}/{repository.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <div className="py-4">
            {sectionTitle("Workspace Tree", projects.length)}
            {projects.length === 0 ? (
              <div className="rounded-sm border border-dashed border-white/10 p-4">
                <p className="text-sm text-zinc-500">No projects yet.</p>
                <p className="mt-2 text-xs leading-5 text-zinc-700">Create one and it will appear here.</p>
              </div>
            ) : (
              <div className="grid gap-1">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.slug}`}
                    className="group flex min-h-11 items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                    title={project.name}
                  >
                    <Icon name="folder" />
                    <span className="truncate font-medium">{project.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </details>

      <div className="border-t border-white/10 p-4">
        <div className="hidden lg:block">
          <Link
            href="/pricing"
            className="group mb-3 flex items-center justify-between gap-3 rounded-sm border border-violet-300/20 bg-violet-500/[0.06] px-2.5 py-2 transition hover:border-violet-200/50 hover:bg-violet-500/10"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100">{isFreePlan ? "Upgrade" : "Account Plan"}</p>
              <p className="truncate text-[11px] text-zinc-500">{isFreePlan ? "More workspaces" : plans[accountPlan].label}</p>
            </div>
            <span className="shrink-0 rounded-sm border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">{accountPlan}</span>
          </Link>
          <Link href="/dashboard/account" className="mb-3 block rounded-sm border border-white/10 bg-black/25 p-3 transition hover:border-violet-300/35 hover:bg-white/[0.03]">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">Usage</p>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">{usageSummary.generationsUsed}</span>
            </div>
            <p className="mt-2 truncate font-mono text-xs text-white">{usageSummary.generations}</p>
            <div className="mt-3 grid gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <span className="truncate">{usageSummary.projects}</span>
              <span className="truncate">{usageSummary.providers}</span>
            </div>
          </Link>
          <details className="group/profile relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm border border-white/10 bg-black/30 p-2 transition hover:border-violet-300/50 hover:bg-white/[0.03] group-open/profile:border-violet-300/40 group-open/profile:bg-violet-500/[0.06] [&::-webkit-details-marker]:hidden">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/[0.03] font-mono text-xs text-violet-200">{initials(identity.name)}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">{identity.email}</span>
              <span className="font-mono text-xs text-zinc-600 transition group-open/profile:text-violet-100">…</span>
            </summary>
            <div className={`${dropdownPanelClass} bottom-full left-0 right-0 mb-2`}>
              <div className="h-px bg-gradient-to-r from-transparent via-violet-200/80 to-transparent" />
              <Link href="/dashboard/account" className="relative block px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-violet-100 transition before:pointer-events-none before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-transparent hover:bg-white/[0.045] hover:text-white hover:before:bg-violet-200/70">Account settings</Link>
              <Link href="/" className="relative block border-t border-white/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-violet-100 transition before:pointer-events-none before:absolute before:inset-y-1 before:left-0 before:w-px before:bg-transparent hover:bg-white/[0.045] hover:text-white hover:before:bg-violet-200/70">Homepage</Link>
              <div className="border-t border-white/10 p-2">
                <SignOutButton />
              </div>
            </div>
          </details>
        </div>
        <div className="lg:hidden">
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
