"use client";

import { SignOutButton } from "@/components/sign-out-button";
import { switchWorkspace } from "@/app/dashboard/workspaces/actions";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { plans, toPlanSlug } from "@/lib/plans";
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
  projects: SidebarProject[];
};

const links = [
  { href: "/dashboard", label: "Overview", icon: "chart" },
  { href: "/dashboard/projects", label: "Projects", icon: "folder" },
  { href: "/dashboard/providers", label: "Providers", icon: "repo" },
  { href: "/dashboard/workspace/settings", label: "Workspace Settings", icon: "sliders" }
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
    "group flex min-w-[10rem] items-center gap-3 rounded-sm border px-3 py-2.5 text-left font-mono text-xs uppercase tracking-[0.14em] transition lg:min-w-0",
    active
      ? "border-violet-300/50 bg-violet-500/10 text-white shadow-[0_0_24px_rgba(139,92,246,0.12)]"
      : "border-transparent text-zinc-500 hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
  ].join(" ");
}

function Icon({ name }: { name: string }) {
  const className = "h-4 w-4 shrink-0 text-zinc-600 group-hover:text-violet-200";

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

export function DashboardNav({ identity, organization, organizations, workspaceLimit, projects }: DashboardNavProps) {
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
      <div className="relative border-b border-white/10 px-4 py-4">
        <details className="group/top relative lg:block">
          <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm border border-transparent px-2 py-2 transition hover:border-white/10 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-violet-300/40 bg-violet-500/10 font-mono text-xs text-violet-100">
              {initials(organization.name)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-white">{organization.name}</span>
            <span className="font-mono text-xs text-zinc-600 transition group-open/top:rotate-180">v</span>
          </summary>
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-sm border border-violet-300/20 bg-[#050507]/98 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(139,92,246,0.12)] backdrop-blur lg:left-0 lg:right-auto lg:w-80">
            <div className="border-b border-white/10 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-violet-200">// Workspaces</div>
            <div className="max-h-56 overflow-y-auto py-1 scrollbar-soft">
              {organizations.map((item) => (
                <form key={item.id} action={switchWorkspace}>
                  <input type="hidden" name="organizationId" value={item.id} />
                  <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.03]" type="submit">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-violet-300/30 bg-violet-500/10 font-mono text-xs text-violet-100">
                      {initials(item.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm text-white">{item.name}</span>
                      <span className="block truncate font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">{item.role}</span>
                    </span>
                    {item.id === organization.id ? (
                      <svg aria-hidden="true" className="h-4 w-4 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                        <path d="m5 12 4 4 10-10" />
                      </svg>
                    ) : null}
                  </button>
                </form>
              ))}
            </div>
            <button
              type="button"
              disabled={workspaceLimit.reached}
              onClick={() => setCreateWorkspaceOpen(true)}
              className="group flex w-full items-center gap-3 border-t border-white/10 px-4 py-3 text-left font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-white/[0.03] hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700 disabled:hover:bg-transparent"
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

      <div className="scrollbar-soft flex gap-2 overflow-x-auto px-4 py-4 lg:block lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:py-6">
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

            <nav className="flex gap-1 lg:mt-5 lg:block lg:space-y-1" aria-label="Project navigation">
              <a href={`/dashboard/projects/${activeProject.slug}`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}`)}>
                <Icon name="chart" />
                <span className="truncate font-medium">Overview</span>
              </a>
              <a href={`/dashboard/projects/${activeProject.slug}/repositories`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/repositories`)}>
                <Icon name="repo" />
                <span className="truncate font-medium">Repositories</span>
              </a>
              <a href={`/dashboard/projects/${activeProject.slug}/changelogs`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/changelogs`)}>
                <Icon name="folder" />
                <span className="truncate font-medium">Changelogs</span>
              </a>
              <a href={`/dashboard/projects/${activeProject.slug}/settings`} className={linkClass(pathname === `/dashboard/projects/${activeProject.slug}/settings`)}>
                <Icon name="sliders" />
                <span className="truncate font-medium">Settings</span>
              </a>
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
                    <a key={repository.id} href={`/dashboard/projects/${activeProject.slug}/repositories`} className="group flex items-center gap-2 rounded-sm px-2 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-600 transition hover:bg-white/[0.03] hover:text-white" title={`${repository.owner}/${repository.name}`}>
                      <Icon name="repo" />
                      <span className="truncate">{repository.owner}/{repository.name}</span>
                    </a>
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
                  <a key={link.href} href={link.href} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                    <Icon name={link.icon} />
                    <span className="truncate font-medium">{link.label}</span>
                  </a>
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
                      <a
                        href={`/dashboard/projects/${project.slug}`}
                        className="group flex items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
                        title={project.name}
                      >
                        <Icon name="folder" />
                        <span className="truncate font-medium">{project.name}</span>
                      </a>
                      {project.repositories.length > 0 ? (
                        <div className="ml-5 border-l border-white/10 pl-3">
                          {project.repositories.map((repository) => (
                            <a key={repository.id} href={`/dashboard/projects/${project.slug}/repositories`} className="group flex items-center gap-2 rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-zinc-600 transition hover:bg-white/[0.03] hover:text-white" title={`${repository.owner}/${repository.name}`}>
                              <Icon name="repo" />
                              <span className="truncate">{repository.owner}/{repository.name}</span>
                            </a>
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

      <div className="border-t border-white/10 p-4">
        <div className="hidden lg:block">
          <a
            href="/pricing"
            className="group mb-3 flex items-center justify-between gap-3 rounded-sm border border-violet-300/20 bg-violet-500/[0.06] px-2.5 py-2 transition hover:border-violet-200/50 hover:bg-violet-500/10"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100">{isFreePlan ? "Upgrade" : "Account Plan"}</p>
              <p className="truncate text-[11px] text-zinc-500">{isFreePlan ? "More workspaces" : plans[accountPlan].label}</p>
            </div>
            <span className="shrink-0 rounded-sm border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">{accountPlan}</span>
          </a>
          <details className="group/profile relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-sm border border-white/10 bg-black/30 px-2 py-2 transition hover:border-violet-300/50 hover:bg-white/[0.03] [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 bg-white/[0.03] font-mono text-xs text-violet-200">{initials(identity.name)}</span>
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300">{identity.email}</span>
              <span className="font-mono text-xs text-zinc-600">...</span>
            </summary>
            <div className="absolute bottom-full left-0 right-0 z-50 mb-2 overflow-hidden rounded-sm border border-violet-300/20 bg-[#050507]/98 shadow-[0_24px_80px_rgba(0,0,0,0.55),0_0_40px_rgba(139,92,246,0.12)] backdrop-blur">
              <a href="/dashboard/account" className="block px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-white/[0.03] hover:text-white">Account settings</a>
              <a href="/" className="block border-t border-white/10 px-4 py-3 font-mono text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:bg-white/[0.03] hover:text-white">Homepage</a>
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
